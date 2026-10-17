(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.PONTE_SUPABASE_CONFIG;
  let client, page=0, factorId='', busy=false, sessionEpoch=0, editing=null, editorEpoch=0, mutating=false, operationsReady=false;
  const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '--';
  const labels={free:'Gratis',pro:'PRO',family:'Familia',trialing:'Teste',active:'Ativa',past_due:'Em atraso',canceled:'Cancelada'};
  const status = message => { $('status').textContent=message; };
  function cell(row,value) { const td=document.createElement('td');td.textContent=value;row.append(td); }
  function clearData() { editing=null;editorEpoch++;if($('user-editor').open)$('user-editor').close();$('user-audit').replaceChildren();$('users').replaceChildren();$('metrics').replaceChildren();$('qr-image').removeAttribute('src');$('otp').value='';$('refresh').disabled=true; }
  function showLogin() { clearData();$('overview').hidden=true;$('mfa').hidden=true;$('access').hidden=true;$('login').hidden=false;$('logout').hidden=true;status(''); }
  function denied(message) { clearData();$('login').hidden=true;$('overview').hidden=true;$('mfa').hidden=true;$('access').hidden=false;$('access-message').textContent=message;status(''); }
  async function overview() {
    if(busy)return;
    const epoch=sessionEpoch;
    busy=true;$('refresh').disabled=true;$('previous').disabled=true;$('next').disabled=true;status('Atualizando...');
    try {
      const {data,error}=await client.rpc('commercial_admin_overview',{page_number:page});
      if(epoch!==sessionEpoch)return;
      if(error)throw error;
      operationsReady=typeof data.blocked==='number';
      $('login').hidden=true;$('access').hidden=true;$('mfa').hidden=true;$('overview').hidden=false;
      $('metrics').replaceChildren();
      const items=[['Total Usuarios',data.users,'Contas cadastradas'],['Ativos',data.active,'Contas sem bloqueio, teste vigente ou periodo vencido'],['Esgotados',data.expired,'Teste ou plano vencido; acesso Gratis preservado'],['Bloqueados',data.blocked,'Acesso ao aplicativo suspenso pela administracao'],['Testes',data.trials,'Periodos de teste vigentes, sem bloqueio'],['Uso do Banco de Dados Total',data.databaseBytes==null?'Indisponivel':(Number(data.databaseBytes)/1048576).toFixed(2)+' MiB','Tamanho total do PostgreSQL, incluindo tabelas e indices; nao inclui arquivos do Storage ou trafego']];
      for(const [label,value,hint] of items){const article=document.createElement('article');article.className='metric';article.title=hint;const title=document.createElement('span');title.textContent=label;const amount=document.createElement('strong');amount.textContent=value==null?'--':String(value);article.append(title,amount);$('metrics').append(article);}
      $('users').replaceChildren();
      for(const user of data.rows){
        const tr=document.createElement('tr');
        cell(tr,user.display_name||'--');
        const password=document.createElement('td');password.append(actionButton('key-round',user.has_password===undefined?'Gerenciar senha':user.has_password?'Redefinir senha':'Definir senha',()=>openUserSection(user,'send-recovery'),!user.email));tr.append(password);
        cell(tr,user.email||user.id);cell(tr,date(user.created_at));cell(tr,date(user.expires_at));
        const state=document.createElement('td'),badge=document.createElement('span');badge.className='status-badge';badge.textContent=labels[user.display_status||user.plan]||user.plan;state.append(badge);
        if(user.blocked||user.expired){const note=document.createElement('small');note.className=user.blocked?'status-blocked':'status-expired';note.textContent=user.blocked?'Bloqueado':'Periodo esgotado';state.append(note);}tr.append(state);
        cell(tr,user.family_linked===undefined?'--':user.family_linked>0||user.personal_plan==='family'&&!user.family_member?'Principal + '+(user.family_linked||0):user.family_member?'Membro vinculado':'0');
        const actions=document.createElement('td');actions.className='row-actions';
        actions.append(actionButton('user-pen','Editar usuario',()=>openUser(user)),actionButton('trash-2','Excluir conta',()=>openUserSection(user,'delete-confirmation'),user.is_admin),actionButton(user.blocked?'lock-open':'ban',user.blocked?'Desbloquear conta':'Bloquear conta',()=>openUserSection(user,'block-user'),user.is_admin||!operationsReady));tr.append(actions);$('users').append(tr);
      }
      window.lucide?.createIcons();
      $('page').textContent=String(page+1);$('previous').disabled=page===0;$('next').disabled=(page+1)*50>=data.users;
      $('updated').textContent='Atualizado '+new Date().toLocaleTimeString('pt-BR');status(operationsReady?'':'Atualizacao administrativa v4 pendente no banco. Novos indicadores e bloqueio ainda indisponiveis.');
    }catch(error){if(epoch===sessionEpoch)denied(error.message?.includes('MFA')?'Confirme o autenticador novamente.':error.code==='PGRST202'?'A migracao comercial ainda nao foi aplicada no Supabase.':'Acesso administrativo indisponivel ou nao autorizado.');}
    finally{busy=false;$('refresh').disabled=$('overview').hidden;}
  }
  function editorStatus(message){$('editor-status').textContent=message;}
  function actionButton(icon,label,callback,disabled=false){const button=document.createElement('button');button.type='button';button.title=label;button.setAttribute('aria-label',label);button.disabled=Boolean(disabled);const i=document.createElement('i');i.setAttribute('data-lucide',icon);button.append(i);button.addEventListener('click',callback);return button;}
  async function openUserSection(user,id){await openUser(user);if(editing?.id===user.id){$(id).scrollIntoView?.({block:'center'});$(id).focus?.();}}
  function syncManualFields(){const manual=$('edit-mode').value==='manual';$('manual-fields').hidden=!manual;$('edit-until').required=manual&&$('edit-plan').value!=='free';}
  function renderAudit(rows){
    $('user-audit').replaceChildren();
    for(const entry of rows){const li=document.createElement('li');li.textContent=new Date(entry.created_at).toLocaleString('pt-BR')+' - '+entry.event_type+(entry.reason?' - '+entry.reason:'');$('user-audit').append(li);}
    if(!rows.length){const li=document.createElement('li');li.textContent='Nenhuma alteracao registrada.';$('user-audit').append(li);}
  }
  async function openUser(user){
    if(mutating)return;
    const epoch=++editorEpoch;editing=null;
    $('editor-email').textContent=user.email||user.id;
    $('editor-info').textContent='Cadastro: '+date(user.created_at)+' | Ultimo login: '+date(user.last_sign_in_at)+(user.is_admin?' | Administrador':'');
    $('edit-name').value='';$('edit-mode').value='keep';$('edit-plan').value=user.plan||'free';$('edit-until').value='';$('edit-reason').value='';syncManualFields();$('user-audit').replaceChildren();
    $('edit-save').disabled=true;$('send-recovery').disabled=true;editorStatus('Buscando dados no banco...');
    $('delete-confirmation').value='';$('delete-user').disabled=true;
    $('block-user').disabled=true;
    if(!$('user-editor').open)$('user-editor').showModal();
    try{
      const {data,error}=await client.rpc('commercial_admin_user_detail',{target_user:user.id});
      if(epoch!==editorEpoch)return;
      if(error)throw error;
      editing={...user,version:data.version};$('edit-name').value=data.name||'';
      renderAudit(data.audit||[]);$('edit-save').disabled=false;$('send-recovery').disabled=!user.email;
      $('delete-user').disabled=Boolean(user.is_admin);
      $('block-user').disabled=Boolean(user.is_admin)||!operationsReady;$('block-user').textContent=user.blocked?'Desbloquear conta':'Bloquear conta';
      editorStatus(data.override?'Ajuste manual: '+(labels[data.override.plan]||data.override.plan)+' | Prazo: '+date(data.override.valid_until):'Dados carregados do banco.');
    }catch{if(epoch===editorEpoch)editorStatus('Nao foi possivel carregar. Confira se a migracao administrativa v2 foi aplicada.');}
  }
  $('edit-mode').addEventListener('change',syncManualFields);$('edit-plan').addEventListener('change',syncManualFields);
  $('editor-close').addEventListener('click',()=>{if(!mutating)$('user-editor').close();});
  $('user-editor').addEventListener('cancel',event=>{if(mutating)event.preventDefault();});
  $('user-editor').addEventListener('close',()=>{editing=null;editorEpoch++;$('user-audit').replaceChildren();});
  $('user-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!editing||mutating)return;
    const user=editing,epoch=editorEpoch,mode=$('edit-mode').value;
    let until=null;
    if(mode==='manual'&&$('edit-until').value){const parsed=new Date($('edit-until').value);if(!Number.isFinite(parsed.getTime())||parsed<=new Date()){editorStatus('Escolha um prazo futuro.');return;}until=parsed.toISOString();}
    if(mode==='manual'&&$('edit-plan').value!=='free'&&!until){editorStatus('Informe o prazo do plano manual.');return;}
    if(!window.confirm('Salvar alteracoes para '+user.email+'? Isso altera o cadastro/acesso, sem realizar cobranca.'))return;
    mutating=true;$('edit-save').disabled=true;$('send-recovery').disabled=true;editorStatus('Salvando...');
    try{
      const {error}=await client.rpc('commercial_admin_edit_user',{target_user:user.id,display_name:$('edit-name').value.trim(),access_mode:mode,manual_plan:$('edit-plan').value,valid_until:until,change_reason:$('edit-reason').value.trim(),expected_version:user.version});
      if(error)throw error;
      if(epoch!==editorEpoch)return;
      editing=null;$('user-editor').close();await overview();status('Usuario atualizado. Alteracao registrada na auditoria.');
    }catch(error){if(epoch===editorEpoch)editorStatus(error.code==='40001'?'O cadastro mudou. Feche e abra novamente antes de salvar.':'Nao foi possivel salvar. Confira os campos, a permissao e a conexao.');}
    finally{mutating=false;$('edit-save').disabled=!editing;$('send-recovery').disabled=!editing?.email;}
  });
  $('send-recovery').addEventListener('click',async()=>{
    if(!editing||mutating)return;
    const user=editing,epoch=editorEpoch;
    if(!window.confirm('Enviar recuperacao de senha para '+user.email+'? O titular definira a nova senha.'))return;
    mutating=true;$('send-recovery').disabled=true;$('edit-save').disabled=true;editorStatus('Solicitando recuperacao...');
    try{
      const authorized=await client.rpc('commercial_admin_recovery_target',{target_user:user.id});
      if(authorized.error)throw authorized.error;
      if(epoch!==editorEpoch)return;
      const {error}=await client.auth.resetPasswordForEmail(authorized.data,{redirectTo:'https://app.nekumafinance.app/app?auth=reset'});
      if(error)throw error;
      if(epoch===editorEpoch)editorStatus('Recuperacao solicitada. O titular deve conferir o e-mail e o spam. A entrega nao e confirmada por esta tela.');
    }catch{if(epoch===editorEpoch)editorStatus('Nao foi possivel solicitar. Aguarde um minuto e tente novamente.');}
    finally{mutating=false;$('send-recovery').disabled=!editing?.email;$('edit-save').disabled=!editing;}
  });
  $('delete-user').addEventListener('click',async()=>{
    if(!editing||mutating||editing.is_admin)return;
    const user=editing,epoch=editorEpoch,email=$('delete-confirmation').value.trim(),reason=$('edit-reason').value.trim();
    if(email!==user.email||reason.length<5){editorStatus('Digite o e-mail exato e um motivo com pelo menos 5 caracteres.');return;}
    if(!window.confirm('Excluir permanentemente a conta '+user.email+' e seus dados privados? Esta acao nao pode ser desfeita. Dados compartilhados nao serao apagados.'))return;
    mutating=true;$('delete-user').disabled=true;$('edit-save').disabled=true;$('send-recovery').disabled=true;
    try{
      const {data,error}=await client.auth.getSession();if(error||!data.session)throw new Error('Sessao expirada.');
      const response=await fetch('/api/admin/delete-user',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({userId:user.id,email,reason})});
      const result=await response.json();
      if(!response.ok||!result.deleted)throw new Error(result.error||'Exclusao nao confirmada.');
      if(epoch!==editorEpoch)return;
      editing=null;$('user-editor').close();await overview();status('Conta excluida. Acao registrada na auditoria.');
    }catch(error){if(epoch===editorEpoch)editorStatus(error.message||'Exclusao nao concluida.');}
    finally{mutating=false;$('delete-user').disabled=!editing||Boolean(editing.is_admin);$('edit-save').disabled=!editing;$('send-recovery').disabled=!editing?.email;}
  });
  $('block-user').addEventListener('click',async()=>{
    if(!editing||mutating||editing.is_admin||!operationsReady)return;
    const user=editing,epoch=editorEpoch,block=!user.blocked,reason=$('edit-reason').value.trim();
    if(reason.length<5)return editorStatus('Informe um motivo com pelo menos 5 caracteres.');
    if(!window.confirm((block?'Bloquear':'Desbloquear')+' o acesso de '+user.email+'? O plano e os dados serao preservados.'))return;
    mutating=true;$('block-user').disabled=true;
    try{
      const {error}=await client.rpc('commercial_admin_set_block',{target_user:user.id,should_block:block,change_reason:reason});if(error)throw error;
      if(epoch!==editorEpoch)return;
      editing=null;$('user-editor').close();await overview();status(block?'Conta bloqueada. Dados preservados.':'Conta desbloqueada.');
    }catch{if(epoch===editorEpoch)editorStatus('Nao foi possivel alterar o bloqueio. Confira permissao, migracao e conexao.');}
    finally{mutating=false;$('block-user').disabled=!editing||Boolean(editing.is_admin);}
  });
  async function boot() {
    if(!config?.url||!window.supabase){denied('Configuracao indisponivel.');return;}
    if(!client){
      client=window.supabase.createClient(config.url,config.anonKey,{auth:{storageKey:'nekuma-admin-auth-v1',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
      client.auth.onAuthStateChange((event, session)=>{
        if(event==='SIGNED_OUT'||!session){sessionEpoch++;factorId='';showLogin();}
      });
    }
    const epoch=sessionEpoch;
    const {data:{session},error}=await client.auth.getSession();
    if(epoch!==sessionEpoch)return;
    if(error||!session){showLogin();return;}
    $('login').hidden=true;$('access').hidden=true;$('logout').hidden=false;
    const access=await client.rpc('my_commercial_access');
    if(epoch!==sessionEpoch)return;
    if(access.error){denied('A migracao comercial ainda nao foi aplicada ou o acesso esta indisponivel.');return;}
    if(!access.data?.isAdmin){denied('Sua conta nao tem permissao administrativa.');return;}
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(epoch!==sessionEpoch)return;
    if(assurance.error){denied('Nao foi possivel validar a seguranca da sessao.');return;}
    if(assurance.data.currentLevel==='aal2'){await overview();return;}
    const factors=await client.auth.mfa.listFactors();
    if(epoch!==sessionEpoch)return;
    if(factors.error){denied('Nao foi possivel consultar o autenticador.');return;}
    factorId=factors.data.totp?.find(item=>item.status==='verified')?.id||'';
    $('mfa').hidden=false;$('enroll').hidden=Boolean(factorId);$('mfa-form').hidden=!factorId;status('');
  }
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault();$('login-submit').disabled=true;status('Validando acesso...');
    try{
      if(!client)throw new Error('Unavailable');
      const {error}=await client.auth.signInWithPassword({email:$('admin-email').value.trim(),password:$('admin-password').value});
      $('admin-password').value='';
      if(error)throw error;
      page=0;await boot();
    }catch{status('Nao foi possivel entrar. Confira suas credenciais e tente novamente.');}
    finally{$('admin-password').value='';$('login-submit').disabled=false;}
  });
  $('retry').addEventListener('click',()=>{status('Verificando acesso...');boot().catch(()=>denied('Nao foi possivel conectar ao banco.'));});
  $('enroll').addEventListener('click',async()=>{
    $('enroll').disabled=true;
    try{
      const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Nekuma Admin '+new Date().toISOString()});
      if(error)throw error;
      factorId=data.id;
      const qr=data.totp.qr_code;
      $('qr-image').src=qr.startsWith('data:')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
      $('qr').hidden=false;$('mfa-form').hidden=false;$('enroll').hidden=true;
    }catch{status('Nao foi possivel cadastrar o autenticador.');$('enroll').disabled=false;}
  });
  $('mfa-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
    try{
      const {error}=await client.auth.mfa.challengeAndVerify({factorId,code:$('otp').value});
      if(error)throw error;
      $('otp').value='';$('qr-image').removeAttribute('src');$('qr').hidden=true;await overview();
    }catch{status('Codigo invalido ou expirado. Tente novamente.');}
    finally{button.disabled=false;}
  });
  $('refresh').addEventListener('click',overview);
  $('previous').addEventListener('click',()=>{if(!busy&&page>0){page--;overview();}});
  $('next').addEventListener('click',()=>{if(!busy){page++;overview();}});
  $('logout').addEventListener('click',async()=>{
    $('logout').disabled=true;
    try{const result=await client?.auth.signOut({scope:'local'});if(result?.error)throw result.error;sessionEpoch++;factorId='';page=0;showLogin();}
    catch{status('Nao foi possivel encerrar a sessao. Tente novamente.');}
    finally{$('logout').disabled=false;}
  });
  window.lucide?.createIcons();
  boot().catch(()=>denied('Nao foi possivel carregar o painel.'));
})();
