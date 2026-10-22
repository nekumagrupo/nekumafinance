(() => {
  'use strict';
  const i18n = window.NekumaI18n;
  const translations = {
    'en-US': {
      skip:'Skip to content',navExperience:'The app',navFeatures:'Why Nekuma?',navFaq:'Questions',login:'Sign in',start:'Get started',
      heroEyebrow:'BRAZIL AND JAPAN. ONE LIFE.',heroTitle:'Your money, in step with your life.',heroDescription:'You work in Japan. You have plans in Brazil. And a family to care for. Bring it all together and see what really remains each month.',heroCta:'Organize my finances',seeApp:'Explore the app',heroNote:'On your phone, tablet or computer. In Portuguese, English and Japanese.',photoCaption:'Clearer finances. More room for your plans.',
      signalSalary:'Japanese salary, without the guesswork',signalCurrencies:'Yen and reais, side by side',signalFamily:'Your family, on the same page',experienceEyebrow:'LESS MENTAL MATH.',experienceTitle:'Make sense of your whole month.',experienceDescription:'From the salary you expect to the expense you just made. Choose a view to explore an example.',tabOverview:'My month',tabSalary:'My salary',tabFamily:'My family',demoMonth:'October · 2026',demoLabel:'Demo',available:'Available balance',availableNote:'See your accounts clearly, without losing the detail.',income:'Income',expenses:'Expenses',whereMoney:'Where did the money go?',housing:'Housing',groceries:'Groceries',transport:'Transport',other:'Other',salaryForecast:'Expected salary',salaryNote:'An estimate based on the information you enter.',workdays:'Workdays',extraHours:'Overtime',salaryComposition:'Understand every part of your salary.',baseSalary:'Base salary',overtime:'Overtime and allowances',forecastTotal:'Expected total',salaryDisclaimer:'Simplified example. Actual amounts depend on the hours, allowances and deductions entered.',familySpending:'Family spending',familyNote:'Individual responsibilities. One shared view.',members:'Members',sharedLife:'Share your life. Organize your finances.',anaResponsibility:'Housing and shopping',rafaelResponsibility:'Groceries and transport',familyDisclaimer:'Select the member and account when recording an expense.',demoCaption:'Illustrative view with fictional data. No bank account is connected in this demo.',
      featuresEyebrow:'MADE FOR YOUR EVERYDAY LIFE.',featuresTitle:'More than an expense log.',featuresDescription:'Bring together the parts of your financial life that are scattered today.',featureSalaryTitle:'Turn your work into a plan.',featureSalaryText:'Enter your hourly pay, shifts and overtime. Track your estimate and confirm the payment in the right account.',featureScanTitle:'A receipt, not a forgotten expense.',featureScanText:'Take a receipt photo, review the AI suggestions and confirm. The expense becomes part of your transactions and summaries.',scanTag:'You review. You confirm.',featureFamilyTitle:'Every household bill has an owner.',featureFamilyText:'Decide who pays rent, electricity, gas and internet. See spending by member and for the whole family.',familyTag:'Less confusion. More clarity.',
      moreEyebrow:'WHAT ABOUT YOUR NEXT PLANS?',moreTitle:'An organized present. A future in sight.',budgetTitle:'Category budgets',budgetText:'Set limits and track what still fits into your month.',cardsTitle:'Cards, installments and bills',cardsText:'See the commitments that continue into the coming months.',goalsTitle:'Goals and assets',goalsText:'Follow your emergency fund, investments and objectives.',projectionTitle:'Cash flow projections',projectionText:'Explore scenarios based on the information you record.',faqEyebrow:'BEFORE YOU START.',faqTitle:'A clearer way forward.',talkSupport:'Contact support',faqInstallQ:'Do I need to install the app?',faqInstallA:'You can use your browser. On your phone, you can also install Nekuma on your home screen and open it like an app.',faqBanksQ:'Does Nekuma move my money?',faqBanksA:'No. Nekuma helps organize and track your financial information. Recording a payment does not execute a bank transfer.',faqLanguageQ:'Can I use another language?',faqLanguageA:'Yes. Choose Portuguese, English or Japanese and change your language in the app settings.',faqScanQ:'Does scanning save expenses automatically?',faqScanA:'No. AI suggests receipt details. You review and confirm before a transaction is created.',finalEyebrow:'NEXT MONTH CAN BE DIFFERENT.',finalTitle:'Working toward your plans starts with understanding your money.',finalCta:'Get started with Nekuma',alreadyAccount:'I already have an account',footerTag:'A life between countries. Your finances in one place.',privacy:'Privacy',terms:'Terms',support:'Support'
    },
    'ja-JP': {
      skip:'本文へ移動',navExperience:'アプリについて',navFeatures:'Nekumaの特長',navFaq:'よくある質問',login:'ログイン',start:'はじめる',
      heroEyebrow:'ブラジルと日本。ひとつの暮らし。',heroTitle:'あなたの暮らしに、お金の見通しを。',heroDescription:'日本で働き、ブラジルにも将来の計画がある。大切な家族もいる。そのすべてをひとつに整理して、毎月いくら残るのかを把握しましょう。',heroCta:'家計の整理をはじめる',seeApp:'アプリを見る',heroNote:'スマートフォン、タブレット、パソコンに対応。ポルトガル語・英語・日本語で。',photoCaption:'家計が見えると、これからの計画も見えてくる。',
      signalSalary:'給与の見通しを、もっと明確に',signalCurrencies:'円とレアルを、並べて管理',signalFamily:'家族で共有する家計の全体像',experienceEyebrow:'頭の中の計算を、もっと少なく。',experienceTitle:'ひと月の家計が、つながって見える。',experienceDescription:'受け取る予定の給与から、今使ったお金まで。表示を切り替えて、利用イメージをご覧ください。',tabOverview:'今月の家計',tabSalary:'給与',tabFamily:'家族',demoMonth:'2026年10月',demoLabel:'デモ',available:'口座残高',availableNote:'口座の全体像と、その内訳をひと目で。',income:'収入',expenses:'支出',whereMoney:'何にお金を使った？',housing:'住居費',groceries:'食費',transport:'交通費',other:'その他',salaryForecast:'給与見込額',salaryNote:'入力した情報をもとにした概算です。',workdays:'勤務日数',extraHours:'残業時間',salaryComposition:'給与の内訳を理解する。',baseSalary:'基本給',overtime:'残業代・各種手当',forecastTotal:'見込合計',salaryDisclaimer:'簡略化した例です。実際の金額は入力した勤務時間、手当、控除によって変わります。',familySpending:'家族の支出',familyNote:'それぞれの担当を、家族で見渡せる。',members:'メンバー',sharedLife:'暮らしをともに。家計を整理。',anaResponsibility:'住居費・買い物',rafaelResponsibility:'食費・交通費',familyDisclaimer:'支出を登録する際に、利用者と口座を選択します。',demoCaption:'架空のデータを使ったイメージ表示です。このデモでは銀行口座への接続は行いません。',
      featuresEyebrow:'毎日の暮らしのために。',featuresTitle:'支出の記録だけでは、終わらない。',featuresDescription:'別々になっていた家計の情報を、ひとつにつなげます。',featureSalaryTitle:'働いた時間を、計画に変える。',featureSalaryText:'時給、シフト、残業時間を登録。給与の見込みを確認し、受取時には該当する口座に記録できます。',featureScanTitle:'レシートを、忘れた支出にしない。',featureScanText:'レシートを撮影し、AIの読み取り結果を確認して確定。支出が取引一覧と集計に反映されます。',scanTag:'確認するのも、確定するのも、あなた。',featureFamilyTitle:'家の請求ごとに、担当者を。',featureFamilyText:'家賃、電気、ガス、インターネットの支払担当者を設定。メンバー別と家族全体の支出を確認できます。',familyTag:'行き違いを減らし、家計を明確に。',
      moreEyebrow:'その先の計画も。',moreTitle:'今を整理して、未来を見渡す。',budgetTitle:'カテゴリ別予算',budgetText:'上限を設定し、今月あといくら使えるかを確認。',cardsTitle:'カード・分割払い・請求',cardsText:'これからの月に続く支払予定を把握。',goalsTitle:'目標と資産',goalsText:'予備資金、投資、目標の進み具合を確認。',projectionTitle:'残高シミュレーション',projectionText:'登録した情報をもとに、将来のシナリオを検討。',faqEyebrow:'はじめる前に。',faqTitle:'気になることを、ここで。',talkSupport:'サポートへ問い合わせ',faqInstallQ:'アプリのインストールは必要ですか？',faqInstallA:'ブラウザから利用できます。スマートフォンではホーム画面に追加し、アプリのように開くこともできます。',faqBanksQ:'Nekumaがお金を動かすことはありますか？',faqBanksA:'ありません。Nekumaは家計の情報を整理・確認するためのアプリです。支払の記録によって銀行振込が実行されることはありません。',faqLanguageQ:'表示言語は変更できますか？',faqLanguageA:'はい。ポルトガル語、英語、日本語から選択でき、アプリの設定から変更できます。',faqScanQ:'レシートの支出は自動で保存されますか？',faqScanA:'いいえ。AIが読み取った内容を提案し、あなたが確認・確定してから取引が作成されます。',finalEyebrow:'来月は、もっと見通しよく。',finalTitle:'これからの計画は、お金の流れを知ることから。',finalCta:'Nekumaをはじめる',alreadyAccount:'アカウントをお持ちの方',footerTag:'国をまたぐ暮らし。家計はひとつの場所に。',privacy:'プライバシー',terms:'利用規約',support:'サポート'
    }
  };
  Object.assign(translations['en-US'], { navPlans:'Plan',pricingEyebrow:'A SIMPLE NEXT STEP.',pricingTitle:'Explore for 3 days. Continue with PRO.',pricingDescription:'One place for your finances in Japan and Brazil, without scattering your accounts across different tools.',trialBadge:'3-day trial',perMonth:'/month',planSubtitle:'After the trial period',planAccounts:'Accounts in yen and reais',planSalary:'Japanese salary and planning',planReceipts:'Receipt scanning with review',planFamily:'Family financial organization',planGoals:'Budgets, goals and assets',trialCta:'Start my 3-day trial' });
  Object.assign(translations['ja-JP'], { navPlans:'プラン',pricingEyebrow:'シンプルな一歩から。',pricingTitle:'3日間試して、PROへ。',pricingDescription:'日本とブラジルの家計を、複数のツールに分けずにひとつの場所で整理。',trialBadge:'3日間お試し',perMonth:'/月',planSubtitle:'お試し期間終了後',planAccounts:'円とレアルの口座管理',planSalary:'日本の給与と家計計画',planReceipts:'確認して登録するレシート読取',planFamily:'家族の家計管理',planGoals:'予算・目標・資産管理',trialCta:'3日間のお試しをはじめる' });
  const supportCopy = {
    'pt-BR': {supportTitle:'Fale com o Nekuma',supportName:'Seu nome',supportEmail:'Seu e-mail',supportQuestion:'Como podemos ajudar?',supportPrivacy:'Não envie senhas ou dados bancários. Usaremos seu e-mail para responder à sua dúvida.',supportSend:'Enviar mensagem',loading:'Preparando envio seguro…',unavailable:'O envio está temporariamente indisponível. Tente novamente mais tarde.',sending:'Enviando…',success:'Mensagem enviada! Responderemos pelo e-mail informado.',failed:'Não foi possível enviar. Tente novamente.',verify:'Confirme a verificação de segurança.'},
    'en-US': {supportTitle:'Contact Nekuma',supportName:'Your name',supportEmail:'Your email',supportQuestion:'How can we help?',supportPrivacy:'Do not send passwords or banking details. We will use your email to reply.',supportSend:'Send message',loading:'Preparing secure delivery…',unavailable:'Sending is temporarily unavailable. Please try again later.',sending:'Sending…',success:'Message sent! We will reply to your email.',failed:'Unable to send. Please try again.',verify:'Complete the security verification.'},
    'ja-JP': {supportTitle:'Nekumaへのお問い合わせ',supportName:'お名前',supportEmail:'メールアドレス',supportQuestion:'お問い合わせ内容',supportPrivacy:'パスワードや銀行情報は送信しないでください。ご入力のメールに返信します。',supportSend:'送信する',loading:'安全な送信を準備中…',unavailable:'現在送信できません。時間をおいてお試しください。',sending:'送信中…',success:'送信しました。メールで返信いたします。',failed:'送信できませんでした。もう一度お試しください。',verify:'セキュリティ認証を完了してください。'}
  };
  Object.assign(translations['en-US'], supportCopy['en-US']);
  Object.assign(translations['ja-JP'], supportCopy['ja-JP']);
  Object.assign(translations['en-US'], {navPlans:'Plans',pricingEyebrow:'A PLAN FOR EVERY STAGE.',pricingTitle:'Your money. Your pace. Your plan.',pricingDescription:'Start with the essentials, expand your planning or organize your family finances. Compare what is included.',pricingAvailability:'You can create a free account now. Paid subscriptions and the 3-day PRO trial are coming soon.',pricingPreservation:'Changed plans? Your records stay saved. Paid features become unavailable on Free without deleting your history.'});
  Object.assign(translations['ja-JP'], {pricingEyebrow:'暮らしに合わせて選ぶプラン。',pricingTitle:'お金の管理を、あなたのペースで。',pricingDescription:'基本の管理から、将来の計画、家族の家計まで。各プランの内容をご確認ください。',pricingAvailability:'無料アカウントは今すぐ作成できます。有料プランとPROの3日間お試しは近日公開予定です。',pricingPreservation:'プランを変更しても記録は保存されます。無料プランでは有料機能が利用できなくなりますが、履歴は削除されません。'});
  const pricingCopy = {
    'pt-BR': {
      names:['Grátis','PRO','Família'],month:'/mês',badges:['O essencial','Mais planejamento','Até 5 pessoas'],more:'Saiba mais',less:'Mostrar menos',
      subtitles:['Para começar a organizar sua vida financeira.','Para entender o mês e planejar o que vem depois.','Tudo do PRO, com a família na mesma página.'],
      ctas:['Criar conta grátis','Conhecer o PRO','Conhecer o Família'],soon:'Contratação em breve',freeNote:'Sem mensalidade',proNote:'3 dias de teste quando liberado',familyNote:'Um plano para até 5 pessoas no total',
      highlights:[['1 conta bancária e 1 cartão','1 fábrica ou fonte de renda','Salário bruto previsto','Comparativo do mês e cripto manual','Calendários, moradia e veículo','Ordem fixa dos cards'],['Contas, cartões e empresas sem limite','Salário com descontos e líquido previsto','Metas, reserva e patrimônio','Orçamentos e projeção de saldo','30 scans de recibos por mês','Integrações cripto e cards personalizáveis'],['Todos os recursos do PRO','Titular + até 4 convidados','Raio-X e organização familiar','Moradia com responsáveis por conta','Negócios e controles da família','60 scans por mês, compartilhados']],
      title:'Compare cada recurso',resource:'Recurso',yes:'Incluído',no:'Não incluído',unlimited:'Sem limite',one:'1',gross:'Somente bruto',full:'Bruto, descontos e líquido',fixed:'Fixa',custom:'Personalizável',manual:'Manual',shared:'60 / mês compartilhados',thirty:'30 / mês',five:'Até 5 pessoas',self:'Individual',
      groups:['Sua rotina financeira','Planejamento e patrimônio','Cripto e produtividade','Vida em família'],
      labels:['Contas bancárias cadastradas','Fábricas e fontes de renda','Cartões, faturas e parcelas','Salário bruto previsto','Descontos e salário líquido previstos','Calendário de trabalho','Subscrições','Moradia e veículo','Calendário financeiro','Comparativo mensal','Lançamentos, extrato e exportação','Metas financeiras','Reserva de emergência','Caixinhas Nubank¹','Financiamentos e consórcios','Orçamento mensal','Projeção de saldo e cenários','Carteira cripto manual','Integrações MetaMask e Binance','Regras de categorização automática','Scan de recibos com revisão','Personalizar a ordem dos cards','Indique e ganhe','Membros e compartilhamento familiar','Responsáveis pelas contas da casa','Negócios e controles familiares','Raio-X familiar'],
      footnote:'¹ Caixinhas disponíveis ao cadastrar uma conta Nubank. Os scans do Família são uma cota única para todos os membros, não por pessoa. Valores em ienes por mês. Nekuma organiza seus registros; não movimenta dinheiro nem executa pagamentos bancários.'
    },
    'en-US': {
      names:['Free','PRO','Family'],month:'/month',badges:['The essentials','More planning','Up to 5 people'],more:'Learn more',less:'Show less',
      subtitles:['Start organizing your financial life.','Understand this month and plan what comes next.','Everything in PRO, with your family on the same page.'],
      ctas:['Create a free account','Explore PRO','Explore Family'],soon:'Subscriptions coming soon',freeNote:'No monthly fee',proNote:'3-day trial when available',familyNote:'One plan for up to 5 people in total',
      highlights:[['1 bank account and 1 card','1 factory or income source','Expected gross salary','Monthly comparison and manual crypto','Calendars, housing and vehicle','Fixed dashboard card order'],['Unlimited accounts, cards and employers','Salary deductions and expected net pay','Goals, emergency fund and assets','Budgets and cash flow projections','30 receipt scans per month','Crypto integrations and customizable cards'],['Everything in PRO','Owner + up to 4 invited members','Family overview and organization','Assigned household bill payers','Family businesses and controls','60 shared scans per month']],
      title:'Compare every feature',resource:'Feature',yes:'Included',no:'Not included',unlimited:'Unlimited',one:'1',gross:'Gross only',full:'Gross, deductions and net',fixed:'Fixed',custom:'Customizable',manual:'Manual',shared:'60 / month shared',thirty:'30 / month',five:'Up to 5 people',self:'Individual',
      groups:['Everyday finances','Planning and assets','Crypto and productivity','Family life'],
      labels:['Registered bank accounts','Factories and income sources','Cards, statements and installments','Expected gross salary','Expected deductions and net salary','Work calendar','Subscriptions','Housing and vehicle','Financial calendar','Monthly comparison','Transactions, statements and export','Financial goals','Emergency fund','Nubank savings boxes¹','Financing and consortiums','Monthly budgets','Cash flow projections and scenarios','Manual crypto portfolio','MetaMask and Binance integrations','Automatic categorization rules','Receipt scanning with review','Customize dashboard card order','Referrals','Family members and sharing','Household bill responsibilities','Family businesses and controls','Family financial overview'],
      footnote:'¹ Savings boxes require a registered Nubank account. Family scans are one shared allowance, not a per-person quota. Prices are in yen per month. Nekuma organizes your records; it does not move money or execute bank payments.'
    },
    'ja-JP': {
      names:['無料','PRO','ファミリー'],month:'/月',badges:['基本の管理','もっと計画的に','最大5人'],more:'詳しく見る',less:'閉じる',
      subtitles:['毎日の家計管理を始めるために。','今月の内訳を把握し、これからの計画へ。','PROの全機能に、家族での共有を。'],
      ctas:['無料アカウントを作成','PROを見る','ファミリーを見る'],soon:'有料プランは近日公開',freeNote:'月額料金なし',proNote:'公開時に3日間お試し',familyNote:'契約者を含む最大5人で利用',
      highlights:[['銀行口座1件・カード1枚','工場または収入源1件','控除前の給与見込額','月別比較・手動の暗号資産管理','カレンダー・住居・車両管理','カードの並び順は固定'],['口座・カード・勤務先は無制限','控除と手取り見込額の内訳','目標・予備資金・資産管理','予算と残高シミュレーション','レシート読取は月30回','暗号資産連携・カードの並べ替え'],['PROのすべての機能','契約者＋招待メンバー最大4人','家族の家計の全体像','住居費の支払担当者を設定','家族の事業・管理機能','月60回の読取を家族で共有']],
      title:'機能を詳しく比較',resource:'機能',yes:'利用可能',no:'対象外',unlimited:'無制限',one:'1件',gross:'控除前のみ',full:'総支給・控除・手取り',fixed:'固定',custom:'並べ替え可能',manual:'手動',shared:'月60回を共有',thirty:'月30回',five:'最大5人',self:'個人',
      groups:['毎日の家計','計画と資産','暗号資産と便利な機能','家族の家計'],
      labels:['登録できる銀行口座','工場・収入源','カード・請求・分割払い','控除前の給与見込額','控除・手取り見込額','勤務カレンダー','サブスクリプション管理','住居・車両管理','家計カレンダー','月別比較','取引・明細・エクスポート','貯蓄目標','緊急時の予備資金','Nubankの貯蓄ボックス¹','ローン・コンソーシアム','月間予算','残高予測・シミュレーション','暗号資産の手動管理','MetaMask・Binance連携','取引の自動分類ルール','確認付きレシート読取','カードの並べ替え','紹介プログラム','家族のメンバー・共有','住居費の支払担当','家族の事業・管理','家族の家計分析'],
      footnote:'¹ 貯蓄ボックスはNubank口座の登録が必要です。ファミリーの読取回数は家族全員で共有する上限です。料金は月額・日本円です。Nekumaは記録を整理するアプリで、送金や銀行の支払いは実行しません。'
    }
  };
  // Rows follow the same plan rules as the app, including shared Family scan quotas.
  const pricingRows = [
    [0,'one','unlimited','unlimited'],[0,'one','unlimited','unlimited'],[0,'one','unlimited','unlimited'],[0,true,true,true],[0,false,true,true],
    [0,true,true,true],[0,true,true,true],[0,true,true,true],[0,true,true,true],[0,true,true,true],[0,true,true,true],
    [1,false,true,true],[1,false,true,true],[1,false,true,true],[1,false,true,true],[1,false,true,true],[1,false,true,true],
    [2,true,true,true],[2,false,true,true],[2,false,true,true],[2,false,'thirty','shared'],[2,false,true,true],[2,true,true,true],
    [3,false,false,'five'],[3,false,false,true],[3,false,false,true],[3,false,false,true]
  ];
  function renderPricing(locale) {
    const cards = document.querySelector('#home-plan-cards');
    const comparison = document.querySelector('#home-plan-comparison');
    if (!cards || !comparison) return;
    const expanded = Boolean(comparison.querySelector('details')?.open);
    const copy = pricingCopy[locale] || pricingCopy['pt-BR'];
    const safe = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const link = href => safe(i18n?.publicUrl(href) || href);
    cards.innerHTML = ['free','pro','family'].map((plan,index) => `<article class="home-plan home-plan-${plan}" aria-labelledby="plan-${plan}-title">
      <span class="home-plan-badge">${safe(copy.badges[index])}</span><h3 id="plan-${plan}-title">${safe(copy.names[index])}</h3><p class="home-plan-summary">${safe(copy.subtitles[index])}</p>
      <p class="home-plan-price">¥${[0,480,850][index]}<span>${safe(copy.month)}</span></p><p class="home-plan-note">${safe([copy.freeNote,copy.proNote,copy.familyNote][index])}</p>
      <a class="button ${index===1?'':'home-plan-secondary'}" href="${link(index===0?'./app.html?auth=signup':'./app.html?tab=plans')}">${safe(copy.ctas[index])}<i data-lucide="${index===0?'arrow-up-right':'arrow-right'}" aria-hidden="true"></i></a>
      <p class="home-plan-status">${index===0?'&nbsp;':safe(copy.soon)}</p><ul>${copy.highlights[index].slice(0,3).map(text=>`<li><i data-lucide="check" aria-hidden="true"></i><span>${safe(text)}</span></li>`).join('')}</ul>
    </article>`).join('');
    const value = item => typeof item==='boolean' ? `<span class="comparison-value ${item?'is-included':'is-excluded'}"><span class="comparison-symbol"><i data-lucide="${item?'check':'x'}" aria-hidden="true"></i></span><span>${safe(item?copy.yes:copy.no)}</span></span>` : `<span class="comparison-text">${safe(copy[item])}</span>`;
    let previousGroup = -1;
    const rows = pricingRows.map(([group,...values],index) => {
      const heading = group!==previousGroup ? `<tr class="comparison-group"><th colspan="4" scope="rowgroup">${safe(copy.groups[group])}</th></tr>` : '';
      previousGroup = group;
      return `${heading}<tr data-plan-feature="${index}"><th scope="row">${safe(copy.labels[index])}</th>${values.map(item=>`<td>${value(item)}</td>`).join('')}</tr>`;
    }).join('');
    comparison.innerHTML = `<details class="plan-comparison-details" ${expanded?'open':''}><summary><span class="comparison-closed-label">${safe(copy.more)}</span><span class="comparison-open-label">${safe(copy.less)}</span><i data-lucide="chevron-down" aria-hidden="true"></i></summary><div class="comparison-expanded"><h3 class="comparison-title" id="comparison-title">${safe(copy.title)}</h3><div class="comparison-scroll" role="region" aria-labelledby="comparison-title" tabindex="0"><table class="plan-comparison-table"><caption class="sr-only">${safe(copy.title)}</caption><thead><tr><th scope="col">${safe(copy.resource)}</th>${copy.names.map((name,index)=>`<th scope="col"><span>${safe(name)}</span><small>¥${[0,480,850][index]}${safe(copy.month)}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="comparison-footnote">${safe(copy.footnote)}</p></div></details>`;
  }
  const originals = new Map([...document.querySelectorAll('[data-copy]')].map(element => [element, element.innerHTML]));
  const originalLinks = new Map([...document.querySelectorAll('a[href]')].map(element => [element, element.getAttribute('href')]));
  const languageSlot = document.querySelector('#home-language');
  if (i18n && languageSlot) languageSlot.innerHTML = i18n.languageSelector('public-language');

  function applyLanguage() {
    const locale = i18n?.publicLanguage() || 'pt-BR';
    document.documentElement.lang = locale;
    originals.forEach((html, element) => {
      const text = translations[locale]?.[element.dataset.copy];
      if (text) element.textContent = text;
      else element.innerHTML = html;
    });
    originalLinks.forEach((href, element) => {
      element.setAttribute('href', href.startsWith('#') ? href : i18n?.publicUrl(href) || href);
    });
    const salaryTag = document.querySelector('.feature-tag');
    if (salaryTag) salaryTag.textContent = locale === 'ja-JP' ? '定時・残業・シフト' : locale === 'en-US' ? 'Teiji · Zangyou · Shifts' : 'Teiji · Zangyou · Turnos';
    const picker = languageSlot?.querySelector('select');
    if (picker) picker.value = locale;
    renderPricing(locale);
    if (window.lucide) window.lucide.createIcons();
  }
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-public-language]')) return;
    i18n.setPublicLanguage(event.target.value);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', event.target.value);
    window.history.replaceState(null, '', url);
    applyLanguage();
  });

  const tabs = [...document.querySelectorAll('[data-demo]')];
  function selectDemo(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(`demo-${item.dataset.demo}`).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDemo(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectDemo(tabs[next], true);
    });
  });
  const supportDialog = document.querySelector('#support-dialog');
  if (supportDialog) {
    const form = document.querySelector('#support-form');
    const status = document.querySelector('#support-status');
    const submit = form.querySelector('button[type="submit"]');
    let token = '', widget, preparing = false;
    const say = key => { status.textContent = (supportCopy[i18n?.publicLanguage()] || supportCopy['pt-BR'])[key]; };
    async function prepare() {
      if (preparing || widget !== undefined) return;
      preparing = true;
      say('loading');
      try {
        const response = await fetch('/api/support', {cache:'no-store'});
        if (!response.ok) throw new Error('Unavailable');
        const config = await response.json();
        if (!config.siteKey) throw new Error('Unavailable');
        if (!window.turnstile) await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.onload = resolve; script.onerror = reject;
          document.head.append(script);
        });
        widget = window.turnstile.render('#support-challenge', {sitekey:config.siteKey, size:'flexible', action:'support', callback:value => { token=value; submit.disabled=false; status.textContent=''; }, 'expired-callback':()=>{ token=''; submit.disabled=true; say('verify'); }, 'error-callback':()=>{ token=''; submit.disabled=true; say('failed'); }});
      } catch { say('unavailable'); }
      finally { preparing=false; }
    }
    document.querySelectorAll('a[href="mailto:suporte@nekumafinance.app"]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault(); supportDialog.showModal(); prepare();
      });
    });
    supportDialog.querySelector('.support-close').addEventListener('click',()=>supportDialog.close());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity() || !token || submit.disabled) return;
      submit.disabled=true; say('sending');
      const data = new FormData(form);
      try {
        const response = await fetch('/api/support', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),email:data.get('email'),message:data.get('message'),token})});
        if (!response.ok) throw new Error('Delivery failed');
        form.reset(); say('success');
      } catch { say('failed'); }
      finally { token=''; window.turnstile.reset(widget); }
    });
  }
  applyLanguage();
})();
