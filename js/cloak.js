!function(){"use strict";

  var CLOAK_KEY="hub_cloak_v1";
  var ADS_KEY="hub_popunder";
  var API=location.pathname.indexOf("/new/")===0?"/papi":"/api";

  var state=loadCloak();
  var realTitle=document.title;
  var realFavicon=(document.querySelector("link[rel~=icon]")||{}).href||"";
  var cloakActive=false;
  var saveTimer=null;
  var prefsId=null;

  function loadCloak(){
    try{var d=JSON.parse(localStorage.getItem(CLOAK_KEY)||"{}");return{enabled:!!d.enabled,title:d.title||"",favicon:d.favicon||""};}
    catch(e){return{enabled:false,title:"",favicon:""};}
  }

  function persistLocal(){try{localStorage.setItem(CLOAK_KEY,JSON.stringify(state));}catch(e){}}

  function save(){persistLocal();clearTimeout(saveTimer);saveTimer=setTimeout(syncToAccount,500);}

  function getToken(){try{return localStorage.getItem("hub_token")||"";}catch(e){return "";}}

  function parseToken(tok){
    try{
      var p=JSON.parse(atob(tok.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      if(!p||!p.id)return null;
      if(p.exp&&p.exp*1000<Date.now())return null;
      return p;
    }catch(e){return null;}
  }

  function syncToAccount(){
    var tok=getToken(); if(!tok)return;
    var parsed=parseToken(tok); if(!parsed)return;
    var h={"Content-Type":"application/json","Authorization":tok};
    var b=JSON.stringify({cloak:{enabled:state.enabled,title:state.title,favicon:state.favicon}});
    if(prefsId){
      fetch(API+"/collections/user_prefs/records/"+prefsId,{method:"PATCH",headers:h,body:b}).catch(function(){});
    }else{
      fetch(API+"/collections/user_prefs/records?perPage=1&filter="+encodeURIComponent("user='"+parsed.id+"'"),{headers:{Authorization:tok}})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(d){var rec=d&&d.items&&d.items[0];if(rec&&rec.id){prefsId=rec.id;fetch(API+"/collections/user_prefs/records/"+prefsId,{method:"PATCH",headers:h,body:b}).catch(function(){});}})
        .catch(function(){});
    }
  }

  function loadFromAccount(){
    var tok=getToken(); if(!tok)return;
    var parsed=parseToken(tok); if(!parsed)return;
    fetch(API+"/collections/user_prefs/records?perPage=1&filter="+encodeURIComponent("user='"+parsed.id+"'"),{headers:{Authorization:tok}})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        var rec=d&&d.items&&d.items[0];
        if(!rec||!rec.id)return;
        prefsId=rec.id;
        if(rec.cloak&&typeof rec.cloak==="object"){
          state={enabled:!!rec.cloak.enabled,title:rec.cloak.title||"",favicon:rec.cloak.favicon||""};
          persistLocal();
          reflectUI();
        }
      }).catch(function(){});
  }

  
  function applyCloak(){
    if(!state.enabled||cloakActive)return;
    cloakActive=true;
    if(state.title)document.title=state.title;
    setFavicon(state.favicon||"data:,");
  }

  function removeCloak(){
    if(!cloakActive)return;
    cloakActive=false;
    document.title=realTitle;
    setFavicon(realFavicon);
  }

  function setFavicon(href){
    var link=document.querySelector("link[rel~=icon]");
    if(!link){link=document.createElement("link");link.rel="icon";document.head.appendChild(link);}
    link.href=href;
  }

  document.addEventListener("visibilitychange",function(){document.hidden?applyCloak():removeCloak();});
  window.addEventListener("blur",applyCloak);
  window.addEventListener("focus",removeCloak);

  
  function updateSwatch(sw,fav){
    if(!sw)return;
    if(fav){sw.style.backgroundImage="url("+fav+")";sw.style.backgroundColor="";}
    else{sw.style.backgroundImage="";sw.style.backgroundColor="var(--surface-3)";}
  }

  function reflectUI(){
    var tog=document.getElementById("cloakEnabled");
    var fields=document.getElementById("cloakFields");
    var titleIn=document.getElementById("cloakTitle");
    var urlIn=document.getElementById("cloakFaviconUrl");
    var sw=document.getElementById("cloakFaviconPreview");
    var adTog=document.getElementById("popunderToggle");
    if(tog)tog.checked=state.enabled;
    if(fields)fields.hidden=!state.enabled;
    if(titleIn)titleIn.value=state.title;
    if(urlIn&&state.favicon&&state.favicon.indexOf("data:")<0)urlIn.value=state.favicon;
    updateSwatch(sw,state.favicon);
    if(adTog)adTog.checked=localStorage.getItem(ADS_KEY)!=="0";
  }

  function escHtml(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}

  document.addEventListener("DOMContentLoaded",function(){
    reflectUI();
    var tog=document.getElementById("cloakEnabled");
    var fields=document.getElementById("cloakFields");
    var titleIn=document.getElementById("cloakTitle");
    var urlIn=document.getElementById("cloakFaviconUrl");
    var fileIn=document.getElementById("cloakFaviconFile");
    var sw=document.getElementById("cloakFaviconPreview");
    var blankBtn=document.getElementById("cloakBlankBtn");
    var adTog=document.getElementById("popunderToggle");

    if(tog){tog.addEventListener("change",function(){state.enabled=tog.checked;if(fields)fields.hidden=!state.enabled;if(!state.enabled)removeCloak();save();});}
    if(titleIn){titleIn.addEventListener("input",function(){state.title=titleIn.value;save();});}
    if(urlIn){urlIn.addEventListener("input",function(){var v=urlIn.value.trim();state.favicon=v;updateSwatch(sw,v);save();});}
    if(fileIn){
      fileIn.addEventListener("change",function(){
        var file=fileIn.files&&fileIn.files[0]; if(!file)return;
        var reader=new FileReader();
        reader.onload=function(e){state.favicon=e.target.result;updateSwatch(sw,e.target.result);if(urlIn)urlIn.value="";save();};
        reader.readAsDataURL(file);
        fileIn.value="";
      });
    }
    if(blankBtn){
      blankBtn.addEventListener("click",function(){
        var url=window.location.href;
        var ct=state.title||document.title;
        var cf=state.favicon||realFavicon;
        var w=window.open("about:blank","_blank");
        if(!w){alert("Pop-up blocked! Allow pop-ups for this site and try again.");return;}
        try{w.opener=null;}catch(e){}
        var fTag=cf?"<link rel=\"icon\" href=\""+escHtml(cf)+"\">":"";
        w.document.write("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>"+escHtml(ct)+"</title>"+fTag+"<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:none}</style></head><body><iframe src=\""+escHtml(url)+"\" allow=\"autoplay;fullscreen;clipboard-write\"></iframe></body></html>");
        w.document.close();
      });
    }
    if(document.getElementById("cloakBlobBtn")){
      document.getElementById("cloakBlobBtn").addEventListener("click",function(){
        var ct=state.title||document.title;
        var cf=state.favicon||realFavicon;
        var fTag=cf?"<link rel=\"icon\" href=\""+escHtml(cf)+"\">":"";
        var html="<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>"+escHtml(ct)+"</title>"+fTag+"<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:none}</style></head><body><iframe src=\""+escHtml(window.location.href)+"\" allow=\"autoplay;fullscreen;clipboard-write\"></iframe></body></html>";
        var blob=new Blob([html],{type:"text/html"});
        var blobUrl=URL.createObjectURL(blob);
        var w=window.open(blobUrl,"_blank");
        if(!w)alert("Pop-up blocked! Allow pop-ups for this site and try again.");
      });
    }
    if(adTog){
      adTog.addEventListener("change",function(){
        if(!adTog.checked){
          if(confirm("Are you sure you want to turn off the popunder and social bar ads? \uD83E\uDD7A\n\nAll revenue from ads goes back into the site for things like:\n\u2022 Links & hosting\n\u2022 Servers & maintenance\n\u2022 Game updates & new content\n\nPress OK to disable and reload the page.")){
            localStorage.setItem(ADS_KEY,"0");
            alert("Okie doke! Popunder and social bar ads will be disabled. Banner ads stay on. The page will reload to apply changes.");
            setTimeout(function(){location.reload();},500);
          }else{adTog.checked=true;}
        }else{
          localStorage.setItem(ADS_KEY,"1");
          alert("Yayyyyy! Popunder and social bar ads will be re-enabled. The page will reload to apply changes.");
          setTimeout(function(){location.reload();},500);
        }
      });
    }
  });

  window.addEventListener("hub:auth",loadFromAccount);
  loadFromAccount();
}();
