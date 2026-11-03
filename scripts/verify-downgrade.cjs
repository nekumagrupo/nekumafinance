const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),store=new Map();
const element=()=>({textContent:'',innerHTML:'',value:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},setAttribute(){}});
const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key),key:i=>[...store.keys()][i],get length(){return store.size}};
const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},body:element(),documentElement:element()};
const window={location:{search:'',hash:'',hostname:'localhost',origin:'http://localhost',pathname:'/app.html'},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),innerWidth:1440};
const hooks=`window.test={remoteSession,remoteStore,normalizeState,planVisibleRecords,activeBankAccounts,setState:value=>{state=normalizeState(value)},mergeSavedWallets,reconcileRemoteState,preserveRestrictedRecordFormats,loadRemoteStateForHousehold,hasPendingLocalChanges,setLoadMocks:(deps)=>{activateRemoteStateStorage=()=>{};fetchRemoteHousehold=async()=>({id:'home',name:'Private'});loadRemoteHouseholdMembers=async()=>{};loadCommercialAccess=async()=>{};reconcileRemoteState=()=>({state:normalizeState(deps.raw),changed:true});persistLocalState=()=>{};flushRemoteState=deps.save;}};`;
vm.runInNewContext(fs.readFileSync('outputs/finance-pwa/app.js','utf8').replace('  initApp();',hooks),{window,document,localStorage:storage,sessionStorage:storage,navigator:{},URLSearchParams,URL,Intl,Date,Number,String,Math,Map,Set,WeakSet,JSON,console,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}});
(async()=>{
 const t=window.test;
 t.remoteStore.enabled=true;t.remoteSession.user={id:'owner'};t.remoteSession.householdId='home';t.remoteSession.householdMembers=[{userId:'owner',role:'owner'}];
 const raw={bankAccounts:[{id:'b1',name:'Bank 1'},{id:'b2',name:'Bank 2'}],incomeSources:[{id:'i1',name:'Company'}],receipts:[{id:'r',merchant:'Legacy',total:10}],familyMembers:[{id:'m',name:'Member'}],creditCards:[{id:'c',name:'Card'}],web3Wallet:{address:'0x123'}};
 const normalized=t.normalizeState(raw);
 assert.doesNotThrow(()=>t.reconcileRemoteState(raw,normalized),'Login reconciliation must work without MetaMask module');
 const wallet={address:'0x'+'1'.repeat(40),chainId:'0x1',updatedAt:'2026-01-01T00:00:00Z',tokens:[]};
 assert.equal(t.mergeSavedWallets({},wallet).wallets.length,1);
 const removed={wallets:[],updatedAt:'2026-02-01T00:00:00Z'};
 assert.equal(t.mergeSavedWallets(removed,wallet).wallets.length,0,'Missing module fallback preserves explicit removals');
 for(const plan of ['free','pro']){
  t.remoteSession.commercialAccess={userId:'owner',plan,personalPlan:plan,limits:{features:plan==='free'?[]:['cards','wealth','receipt_scan','automation','projections','metamask']}};
  const outgoing=t.preserveRestrictedRecordFormats(raw,normalized);
  assert.equal(JSON.stringify(outgoing.bankAccounts),JSON.stringify(raw.bankAccounts),'Existing bank account formats must survive normalization');
  assert.equal(JSON.stringify(outgoing.incomeSources),JSON.stringify(raw.incomeSources));
  const added=t.preserveRestrictedRecordFormats(raw,{...normalized,bankAccounts:[...normalized.bankAccounts,{id:'new',name:'New'}]});
  assert.ok(added.bankAccounts.some(row=>row.id==='new'),'New accounts must still reach server quota enforcement');
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
 const accounts=[{id:'later',name:'Later',sortOrder:0,createdAt:'2026-02-01'},{id:'first',name:'First',sortOrder:9,createdAt:'2026-01-01'}];
 t.setState({bankAccounts:accounts});
 assert.equal(t.activeBankAccounts().length,1);
 assert.equal(t.activeBankAccounts()[0].id,'first','Free uses creation date, never user layout order');
 assert.equal(t.planVisibleRecords(raw.bankAccounts)[0].id,'b1','Legacy selection follows saved order');
 t.remoteSession.commercialAccess.plan='pro';
 assert.equal(t.activeBankAccounts().length,2,'Upgrade restores visibility without deleting records');
 t.remoteSession.commercialAccess.plan='free';
 t.remoteStore.client={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{state:raw,updated_at:'2026-10-01T00:00:00Z'}}}}}};
 let writes=0;
 t.setLoadMocks({raw,save:async()=>{writes++;throw Error('PLAN_LIMIT: bankAccounts (limite 1)')}});
 await t.loadRemoteStateForHousehold('home',true);
 assert.equal(writes,0,'Free login must not write or prune an existing over-limit state');
 t.remoteSession.status='ready';assert.equal(t.hasPendingLocalChanges(),true,'Rejected pending data must not be overwritten by auto-pull');
 t.setLoadMocks({raw,save:async()=>{throw Error('Network failure')}});
 t.remoteSession.commercialAccess.plan='pro';
 await assert.rejects(t.loadRemoteStateForHousehold('home',true),/Network failure/,'Only plan reconciliation errors are nonfatal');
 console.log('PASS: Free/PRO preserve raw family records; Free preserves premium formats; real edits are not silently dropped; plan reconciliation does not reject login; pending data retained; other failures propagate. VM/mocked persistence tests.');
})().catch(error=>{console.error(error);process.exitCode=1});
