(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.PONTE_SUPABASE_CONFIG;
  let client, page=0, factorId='', busy=false, sessionEpoch=0, editing=null, editorEpoch=0, mutating=false, operationsReady=false;
  const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '--';
  const labels={free:'Gratis',pro:'PRO',family:'Familia',trialing:'Teste',active:'Ativa',past_due:'Em atraso',canceled:'Cancelada'};
  const status = message => { $('status').textContent=message; };
  function cell(row,value) { const td=document.createElement('td');td.textContent=value;row.append(td); }
  function clearData() { editing=null;editorEpoch++;if($('user-editor').open)$('user-editor').close();$('user-audit').replaceChildren();$('users').replaceChildren();$('metrics').replaceChildren();$('service-usage').replaceChildren();$('service-live-status').textContent='';$('paypal-setup-status').textContent='';$('paypal-setup').disabled=false;$('admin-identity').textContent='';$('qr-image').removeAttribute('src');$('otp').value='';$('refresh').disabled=true; }
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
      const db=databaseCapacity(data.databaseBytes);
      const items=[['Total Usuarios',data.users,'Contas cadastradas'],['Ativos',data.active,'Contas sem bloqueio, teste vigente ou periodo vencido'],['Esgotados',data.expired,'Teste ou plano vencido; acesso Gratis preservado'],['Bloqueados',data.blocked,'Acesso ao aplicativo suspenso pela administracao'],['Testes',data.trials,'Periodos de teste vigentes, sem bloqueio'],['Banco de Dados',db.label,'PostgreSQL medido no banco / referencia do Supabase Free (500 MB). Confirme a franquia no painel do provedor. Nao inclui Storage ou trafego']];
      for(const [label,value,hint] of items){const article=document.createElement('article');article.className='metric';article.title=hint;const title=document.createElement('span');title.textContent=label;const amount=document.createElement('strong');amount.textContent=value==null?'--':String(value);article.append(title,amount);$('metrics').append(article);}
      renderServiceUsage(db);
      loadServiceUsage(epoch);
      $('users').replaceChildren();
      for(const user of data.rows){
        const tr=document.createElement('tr');
        const name=document.createElement('td');name.textContent=user.display_name||'--';
        if(user.is_admin){const admin=document.createElement('span');admin.className='status-badge admin-badge';admin.textContent='ADMIN';name.append(admin);}tr.append(name);
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
  function databaseCapacity(bytes){
    // Published Free allowance is a reference, not a billing API response.
    const limit=500000000,used=bytes==null?null:Number(bytes);
    if(used===null||!Number.isFinite(used)||used<0)return {label:'Indisponivel / 500 MB',used:null,limit,percent:null};
    return {label:(used/1000000).toFixed(2)+' / 500 MB',used,limit,percent:used/limit*100};
  }
  function renderServiceUsage(db){
    const root=$('service-usage');root.replaceChildren();
    const sections=[
      ['Supabase · Banco de dados',db.label,db.used===null?'Leitura do banco indisponivel.':Math.max(0,(db.limit-db.used)/1000000).toFixed(2)+' MB restantes na referencia Free. '+db.percent.toFixed(1)+'% utilizado.', 'https://supabase.com/dashboard/project/ysggihygadpfjyywtvyy'],
      ['Supabase · Outros consumos','Consumo nao conectado','Storage: referencia Free de 1 GB. Trafego, usuarios ativos mensais e conexoes devem ser conferidos no painel do Supabase.','https://supabase.com/dashboard/project/ysggihygadpfjyywtvyy'],
      ['Resend · Emails','Consumo nao conectado','Referencia Free: 100 emails/dia e 3.000/mes. O total da conta (incluindo SMTP) ainda nao e consultado por este painel.','https://resend.com/settings/usage']
    ];
    sections.forEach(([title,value,description,url],index)=>{
      const section=document.createElement('section'),heading=document.createElement('h3'),amount=document.createElement('strong'),note=document.createElement('p'),link=document.createElement('a');
      section.className='service-usage-item';heading.textContent=title;amount.textContent=value;note.textContent=description;link.textContent='Conferir no provedor';link.href=url;link.target='_blank';link.rel='noopener noreferrer';section.append(heading,amount);
      if(index===0&&db.percent!==null){const progress=document.createElement('progress');progress.max=100;progress.value=Math.min(100,db.percent);progress.setAttribute('aria-label','Uso do banco em relacao a referencia Free');section.append(progress);if(db.percent>=80){section.classList.add('usage-warning');note.textContent=(db.percent>=95?'Critico: ':'Atencao: ')+description;}}
      section.append(note,link);root.append(section);
    });
  }
  function editorStatus(message){$('editor-status').textContent=message;}
  function metricBar(section,label,value,maximum,display,tone='green'){
    const row=document.createElement('div'),head=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong');
    row.className='metric-chart-row tone-'+tone;head.className='metric-chart-label';name.textContent=label;amount.textContent=display;head.append(name,amount);row.append(head);
    if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&typeof maximum==='number'&&maximum>0){
      const bar=document.createElement('progress');bar.max=maximum;bar.value=Math.min(value,maximum);bar.setAttribute('aria-label',label+': '+display);row.append(bar);
      if(['CPU','RAM','Disco'].includes(label)&&value>=80)row.classList.add('chart-warning');
    }else row.classList.add('chart-unavailable');
    section.append(row);
  }
  async function loadServiceUsage(epoch){
    const statusNode=$('service-live-status');statusNode.textContent='Consultando indicadores dos provedores...';
    try{
      const {data,error}=await client.auth.getSession();
      if(epoch!==sessionEpoch)return;
      if(error||!data?.session?.access_token){statusNode.textContent='Sessao de monitoramento indisponivel.';return;}
      const response=await fetch('/api/admin/usage',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
      if(epoch!==sessionEpoch)return;
      if(!response.ok){let message='';try{const failure=await response.json();message=typeof failure.error==='string'?failure.error.slice(0,240):'';}catch{}if(epoch!==sessionEpoch)return;statusNode.textContent=response.status===404?'Publique a funcao de monitoramento no Cloudflare para conectar os indicadores.':'Monitoramento HTTP '+response.status+': '+(message||'Resposta indisponivel. Confira a configuracao do servidor.');return;}
      const live=await response.json();
      if(epoch!==sessionEpoch)return;
      const sections=$('service-usage').children;
      const reasons={not_configured:'Chave de monitoramento ainda nao configurada no Cloudflare.',credential_permissions:'Chave invalida ou sem permissao de consulta.',no_data:'O provedor nao retornou dados para esta janela.',invalid_response:'Resposta do provedor nao reconhecida.',provider_unavailable:'Provedor indisponivel no momento.'};
      const note=(section,text)=>{const p=document.createElement('p');p.textContent=text;section.append(p);};
      const title=(section,text)=>{section.replaceChildren();const h=document.createElement('h3');h.textContent=text;section.append(h);};
      const meter=(section,label,value)=>{
        if(!value||typeof value.used!=='number'||!Number.isFinite(value.used)||value.used<0)return note(section,label+': indisponivel');
        const strong=document.createElement('strong');strong.textContent=label+': '+value.used.toLocaleString('pt-BR')+' / '+(value.limit===null?'Sem limite':Number(value.limit).toLocaleString('pt-BR'));section.append(strong);
        if(typeof value.limit==='number'&&value.limit>0){const percent=value.used/value.limit*100,progress=document.createElement('progress');progress.max=100;progress.value=Math.min(100,percent);progress.setAttribute('aria-label',label);section.append(progress);note(section,(percent>=95?'Critico: ':percent>=80?'Atencao: ':'')+Math.max(0,value.limit-value.used).toLocaleString('pt-BR')+' restantes · '+percent.toFixed(1)+'% utilizado.');if(percent>=80)section.classList.add('usage-warning');}
        if(value.resetsAt)note(section,'Renova em '+new Date(value.resetsAt).toLocaleString('pt-BR'));
      };
      if(live.resend?.connected){title(sections[2],'Resend · Consumo real da conta');meter(sections[2],'Hoje',live.resend.daily);meter(sections[2],'Mes',live.resend.monthly);note(sections[2],'Medido em '+new Date(live.resend.measuredAt).toLocaleString('pt-BR'));}
      else note(sections[2],reasons[live.resend?.reason]||'Consulta indisponivel.');
      if(live.supabase?.connected){title(sections[1],'Supabase · Requisicoes do projeto');const max=Math.max(1,...Object.values(live.supabase.requests||{}).filter(value=>typeof value==='number'));for(const [key,label] of [['total_auth_requests','Auth'],['total_rest_requests','Banco/API'],['total_realtime_requests','Realtime'],['total_storage_requests','Storage/API']]){const value=live.supabase.requests?.[key];metricBar(sections[1],label,value,max,typeof value==='number'?value.toLocaleString('pt-BR'):'Indisponivel','blue');}note(sections[1],'Janela: '+(live.supabase.from?new Date(live.supabase.from).toLocaleString('pt-BR'):'--')+' a '+(live.supabase.to?new Date(live.supabase.to).toLocaleString('pt-BR'):'--')+'. Barras comparativas; nao representam franquia de trafego.');}
      else note(sections[1],reasons[live.supabase?.reason]||'Consulta indisponivel.');
      const infra=document.createElement('section');infra.className='service-usage-item infrastructure-charts';title(infra,'Supabase · Infraestrutura');$('service-usage').append(infra);
      if(live.infrastructure?.connected){
        const data=live.infrastructure,percent=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(1)+'%':'Indisponivel',gb=value=>(value/1000000000).toFixed(2)+' GB';
        metricBar(infra,'CPU',data.cpu?.percent,100,percent(data.cpu?.percent),'blue');
        if(data.cpuWaiting)note(infra,'CPU aguardando duas coletas no mesmo servidor.');
        metricBar(infra,'RAM',data.memory?.percent,100,percent(data.memory?.percent)+(data.memory?' · '+gb(data.memory.used)+' / '+gb(data.memory.total):''),'blue');
        metricBar(infra,'Disco',data.disk?.percent,100,percent(data.disk?.percent)+(data.disk?' · '+gb(data.disk.used)+' / '+gb(data.disk.total):''),'amber');
        metricBar(infra,'Conexoes',data.connections?.used,data.connections?.total,data.connections?data.connections.used+' / '+(data.connections.total??'limite indisponivel'):'Indisponivel');
        if([data.cpu?.percent,data.memory?.percent,data.disk?.percent].some(value=>value>=80)){infra.classList.add('usage-warning');note(infra,'Atencao: recurso em 80% ou mais. Confira a infraestrutura no Supabase.');}
        note(infra,'Coleta: '+new Date(data.measuredAt).toLocaleString('pt-BR')+'. Disco inclui arquivos do sistema; nao e a franquia de dados do plano. CPU depende de duas amostras e pode ficar indisponivel em uma nova instancia do monitor.');
      }else note(infra,live.infrastructure?.reason==='infrastructure_permissions'?'O token precisa de Logs — Read para consultar a Metrics API. Usage Analytics — Read sozinho nao autoriza infraestrutura.':reasons[live.infrastructure?.reason]||'Infraestrutura indisponivel.');
      const emails=document.createElement('section');emails.className='service-usage-item';title(emails,'Resend · Entregabilidade (15 dias)');$('service-usage').append(emails);
      if(live.emailMetrics?.connected){const data=live.emailMetrics,totals=data.totals,max=Math.max(1,...['sent','delivered','bounced','complained','failed'].map(key=>totals[key]||0));for(const [key,label,tone] of [['sent','Enviados','blue'],['delivered','Entregues','green'],['bounced','Devolvidos','amber'],['complained','Reclamacoes','red'],['failed','Falhas','red']])metricBar(emails,label,totals[key],max,String(totals[key]??'Indisponivel'),tone);for(const [key,label] of [['delivery_rate','Taxa de entrega'],['bounce_rate','Taxa de devolucao'],['complaint_rate','Taxa de reclamacao']])note(emails,label+': '+(totals.sent===0?'Sem envios':typeof totals[key]==='number'&&totals[key]<=100?totals[key].toFixed(1)+'%':'Indisponivel'));note(emails,'Periodo UTC: '+data.from+' a '+data.to+'. Medido em '+new Date(data.measuredAt).toLocaleString('pt-BR'));}
      else note(emails,reasons[live.emailMetrics?.reason]||'Metricas de entrega indisponiveis.');
      statusNode.textContent='Consulta concluida. Cache de ate 5 minutos; indicadores ausentes nao sao considerados zero.';
    }catch{if(epoch===sessionEpoch)statusNode.textContent='Monitoramento nao conectado. Publique a funcao no Cloudflare e confira os secrets de consulta.';}
  }
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
    $('admin-identity').textContent='ADMIN · '+(session.user.email||session.user.id);
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
  $('paypal-setup').addEventListener('click',async()=>{
    if(busy||$('paypal-setup').disabled||!window.confirm('Preparar ou reutilizar os planos PayPal Sandbox PRO JPY 480 e Familia JPY 850? Sem cobrancas reais.'))return;
    const epoch=sessionEpoch;
    const button=$('paypal-setup');button.disabled=true;$('paypal-setup-status').textContent='Verificando ADMIN e preparando catalogo de testes...';
    try{
      const {data,error}=await client.auth.getSession();if(error||!data.session)throw new Error('Sessao expirada.');
      const response=await fetch('/api/paypal/setup',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({confirm:'CREATE_SANDBOX_CATALOG'})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Nao foi possivel preparar os planos.');
      if(epoch!==sessionEpoch)return;
      if(result.environment!=='sandbox'||!/^P-[A-Z0-9]+$/.test(result.plans?.pro||'')||!/^P-[A-Z0-9]+$/.test(result.plans?.family||''))throw new Error('Resposta de configuracao invalida.');
      const prefix=result.merchantProfile==='jp'?'PAYPAL_JP_SANDBOX_':'PAYPAL_SANDBOX_';
      $('paypal-setup-status').textContent='Planos de teste verificados ('+(result.merchantProfile==='jp'?'Japao':'legado')+'). Configure no Cloudflare: '+prefix+'PRO_PLAN_ID='+result.plans.pro+'; '+prefix+'FAMILY_PLAN_ID='+result.plans.family+'. Reimplante antes de testar o checkout.';
    }catch(error){if(epoch===sessionEpoch)$('paypal-setup-status').textContent=error.message||'Preparacao indisponivel.';}finally{if(epoch===sessionEpoch)button.disabled=false;}
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
