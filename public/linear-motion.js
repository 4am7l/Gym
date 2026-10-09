/* Progressive UI motion; does not alter routing, data or user actions. */
(function(){
  'use strict';
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  function animatePanel(panel){
    if(!panel||reduce.matches||!panel.animate)return;
    panel.animate([{opacity:.55,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:210,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function setup(){
    const area=document.querySelector('#admin-portal-view .content-area');
    if(!area)return;
    let previous=area.querySelector('.section-view.active');
    const observer=new MutationObserver(()=>{
      const active=area.querySelector('.section-view.active');
      if(active&&active!==previous){previous=active;animatePanel(active);}
    });
    observer.observe(area,{subtree:true,attributes:true,attributeFilter:['class']});
    document.querySelectorAll('#admin-portal-view .nav-link').forEach(el=>{
      if(!el.hasAttribute('tabindex'))el.tabIndex=0;
      if(!el.hasAttribute('role'))el.setAttribute('role','button');
      el.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
