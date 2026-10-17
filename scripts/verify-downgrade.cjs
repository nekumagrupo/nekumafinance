const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),store=new Map();
const element=()=>({textContent:'',innerHTML:'',value:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},setAttribute(){}});
const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key),key:i=>[...store.keys()][i],get length(){return store.size}};
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},body:element(),documentElement:element()};
const window={location:{search:'',hash:'',hostname:'localhost',origin:'http://localhost',pathname:'/app.html'},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),innerWidth:1440};
const hooks=`window.test={remoteSession,remoteStore,normalizeState,preserveRestrictedRecordFormats,loadRemoteStateForHousehold,hasPendingLocalChanges,setLoadMocks:(deps)=>{activateRemoteStateStorage=()=>{};fetchRemoteHousehold=async()=>({id:'home',name:'Private'});loadRemoteHouseholdMembers=async()=>{};loadCommercialAccess=async()=>{};reconcileRemoteState=()=>({state:normalizeState(deps.raw),changed:true});persistLocalState=()=>{};flushRemoteState=deps.save;}};`;
vm.runInNewContext(fs.readFileSync('outputs/finance-pwa/app.js','utf8').replace('  initApp();',hooks),{window,document,localStorage:storage,sessionStorage:storage,navigator:{},URLSearchParams,URL,Intl,Date,Number,String,Math,Map,Set,WeakSet,JSON,console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}});
(async()=>{
 const t=window.test;
 t.remoteStore.enabled=true;t.remoteSession.user={id:'owner'};t.remoteSession.householdId='home';t.remoteSession.householdMembers=[{userId:'owner',role:'owner'}];
 const raw={receipts:[{id:'r',merchant:'Legacy',total:10}],familyMembers:[{id:'m',name:'Member'}],creditCards:[{id:'c',name:'Card'}],web3Wallet:{address:'0x123'}};
 const normalized=t.normalizeState(raw);
 for(const plan of ['free','pro']){
  t.remoteSession.commercialAccess={userId:'owner',plan,personalPlan:plan,limits:{features:plan==='free'?[]:['cards','wealth','receipt_scan','automation','projections','metamask']}};
  const outgoing=t.preserveRestrictedRecordFormats(raw,normalized);
  assert.equal(JSON.stringify(outgoing.familyMembers),JSON.stringify(raw.familyMembers),'Family format must not be rewritten on downgrade');
  if(plan==='free'){
   assert.equal(JSON.stringify(outgoing.receipts),JSON.stringify(raw.receipts));
   assert.equal(JSON.stringify(outgoing.creditCards),JSON.stringify(raw.creditCards));
   assert.equal(JSON.stringify(outgoing.web3Wallet),JSON.stringify(raw.web3Wallet));
   const changed=t.preserveRestrictedRecordFormats(raw,{...normalized,receipts:normalized.receipts.map(r=>({...r,merchant:'Changed'}))});
   assert.equal(changed.receipts[0].merchant,'Changed','Real restricted edits must reach the server guard, not be silently dropped');
  }
 }
 t.remoteSession.commercialAccess={userId:'owner',plan:'free',limits:{features:[]}};
 t.remoteStore.client={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{state:raw,updated_at:'2026-10-01T00:00:00Z'}}}}}};
 const restricted=Object.assign(new Error('Pending restricted change'),{planRestricted:true});
 t.setLoadMocks({raw,save:async()=>{throw restricted}});
 await t.loadRemoteStateForHousehold('home',true);
 assert.equal(t.remoteSession.error,'Pending restricted change');
 t.remoteSession.status='ready';assert.equal(t.hasPendingLocalChanges(),true,'Rejected pending data must not be overwritten by auto-pull');
 t.setLoadMocks({raw,save:async()=>{throw Error('Network failure')}});
 await assert.rejects(t.loadRemoteStateForHousehold('home',true),/Network failure/,'Only plan reconciliation errors are nonfatal');
 console.log('PASS: Free/PRO preserve raw family records; Free preserves premium formats; real edits are not silently dropped; plan reconciliation does not reject login; pending data retained; other failures propagate. VM/mocked persistence tests.');
})().catch(error=>{console.error(error);process.exitCode=1});
