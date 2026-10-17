(function () {
  "use strict";

  const PUBLIC_LANGUAGE_KEY = "nekuma-public-language";
  const SUPPORTED = ["pt-BR", "en-US", "ja-JP"];
  const labels = { "pt-BR": "Português", "en-US": "English", "ja-JP": "日本語" };

  const messages = {
    "en-US": {
      "Raio-X": "Overview", "Recursos": "Features", "Preços": "Pricing", "Comece já": "Get started",
      "Começar agora": "Get started", "Organização financeira para brasileiros no Japão": "Financial organization for life in Japan",
      "Organize sua vida financeira entre Brasil e Japão. Chegue no fim do mês sabendo o que aconteceu.": "Organize your financial life between Brazil and Japan. Reach the end of the month knowing exactly what happened.",
      "Você trabalha duro no Japão. O Nekuma ajuda a descobrir para onde seu dinheiro está indo, quanto realmente sobra do salário e quanto pode guardar com segurança.": "You work hard in Japan. Nekuma shows where your money goes, what truly remains from your salary, and how much you can safely save.",
      "Salário japonês": "Japanese salary", "previsão sem conta na mão": "forecast without manual calculations", "Quanto sobra": "What remains",
      "entradas menos gastos reais": "income minus actual expenses", "Iene + real": "Yen + real", "duas moedas no mesmo painel": "two currencies in one dashboard",
      "Família": "Family", "casa inteira no mesmo orçamento": "the whole household in one budget", "A pergunta que muda o mês": "The question that changes your month",
      "Você sabe quanto realmente sobra do seu salário?": "Do you know how much of your salary really remains?", "O Nekuma faz esse raio-X para você.": "Nekuma builds this overview for you.",
      "Veja o Nekuma em ação": "See Nekuma in action", "Um painel para entender o mês sem abrir banco, calculadora e planilha.": "One dashboard to understand your month without opening banks, calculators, and spreadsheets.",
      "O que torna o Nekuma diferente": "What makes Nekuma different", "Alertas que mostram o que merece sua atenção antes de virar susto.": "Alerts that show what needs attention before it becomes a problem.",
      "Feito para quem vive entre dois países": "Made for people living between two countries", "Mora no Japão, mas ainda tem vida financeira no Brasil?": "Living in Japan while still managing finances in Brazil?",
      "Centralizar tudo no Nekuma": "Bring everything into Nekuma", "O que o Nekuma resolve": "What Nekuma solves", "Organização financeira descomplicada para o mês real.": "Straightforward financial organization for real life.",
      "Planos": "Plans", "7 dias grátis": "7 days free", "Comece sem compromisso": "Start with no commitment", "Nekuma Finance PRO": "Nekuma Finance PRO",
      "Todas as funcionalidades liberadas. Aplicativo sempre atualizado com novas atualizações. Contas familiares sincronizadas, relatórios completos e muito mais.": "All features unlocked, continuous updates, complete reports, and much more.",
      "Seu dinheiro mais claro": "Your money, made clearer", "Comece hoje a organizar seu mês com mais clareza.": "Start organizing your month with more clarity today.",
      "Política de Privacidade": "Privacy Policy", "Termos de Serviço": "Terms of Service", "Login": "Sign in",
      "Bem-vindo ao Nekuma": "Welcome to Nekuma", "Bem-vindo ao Nekuma.": "Welcome to Nekuma.", "Crie sua conta Nekuma.": "Create your Nekuma account.",
      "Recupere sua senha.": "Recover your password.", "Acesso seguro": "Secure access", "Entre para acessar sua vida financeira": "Sign in to access your financial life",
      "Conectando ao Nekuma Finance": "Connecting to Nekuma Finance", "ou entre com email": "or sign in with email", "Senha": "Password", "Esqueceu a senha?": "Forgot your password?",
      "Entrar": "Sign in", "Ainda não tem conta?": "Don't have an account yet?", "Cadastre-se": "Create account", "Continuar com Google": "Continue with Google",
      "Instalar Nekuma": "Install Nekuma", "Acesso direto pelo ícone do app": "Open directly from the app icon", "Cadastro": "Registration", "Criar sua conta": "Create your account",
      "Voltar": "Back", "Nome da família": "Family name", "opcional": "optional", "Código da família": "Family code", "ou crie com email": "or create with email",
      "Criar login": "Create account", "Já tem cadastro?": "Already registered?", "Recuperar senha": "Recover password", "Informe seu email": "Enter your email",
      "Confira seu email": "Check your email", "Crie uma nova senha": "Create a new password", "Nova senha": "New password", "Confirmar nova senha": "Confirm new password",
      "Salvar nova senha": "Save new password", "Voltar para login": "Back to sign in", "Dashboard": "Dashboard", "Banking": "Banking", "Orcamentos": "Budgets",
      "Projecoes": "Forecasts", "Cripto": "Crypto", "Cartoes": "Cards", "Patrimonio": "Wealth", "Extrato": "Transactions", "Ajustes": "Settings",
      "Pesquisar": "Search", "Inicio": "Home", "Menu": "Menu", "Sair": "Sign out", "Idioma": "Language", "Portugues": "Portuguese", "Japones": "Japanese", "Ingles": "English",
      "Salvar ajustes": "Save settings", "Ajustes salvos.": "Settings saved.", "Escolha o idioma do aplicativo": "Choose the app language", "Você poderá alterar esta opção depois em Ajustes.": "You can change this later in Settings.",
      "Continuar": "Continue", "Aplicando idioma": "Applying language", "Confirmar alteração de idioma?": "Confirm language change?", "O aplicativo será reiniciado para aplicar o novo idioma.": "The app will restart to apply the new language."
    },
    "ja-JP": {
      "Raio-X": "家計分析", "Recursos": "機能", "Preços": "料金", "Comece já": "今すぐ始める", "Começar agora": "今すぐ始める",
      "Organização financeira para brasileiros no Japão": "日本で暮らす人のための家計管理",
      "Organize sua vida financeira entre Brasil e Japão. Chegue no fim do mês sabendo o que aconteceu.": "日本とブラジルのお金をまとめて管理し、毎月の収支をわかりやすく把握できます。",
      "Você trabalha duro no Japão. O Nekuma ajuda a descobrir para onde seu dinheiro está indo, quanto realmente sobra do salário e quanto pode guardar com segurança.": "Nekumaなら、支出の行き先、給与から実際に残る金額、無理なく貯められる金額がわかります。",
      "Salário japonês": "日本の給与", "previsão sem conta na mão": "手計算なしで給与を予測", "Quanto sobra": "残る金額", "entradas menos gastos reais": "収入から実際の支出を差し引く",
      "Iene + real": "円＋レアル", "duas moedas no mesmo painel": "2通貨を同じ画面で管理", "Família": "家族", "casa inteira no mesmo orçamento": "家族全体の家計を一つに",
      "A pergunta que muda o mês": "家計を変える大切な質問", "Você sabe quanto realmente sobra do seu salário?": "給与から本当にいくら残るか知っていますか？",
      "O Nekuma faz esse raio-X para você.": "Nekumaが家計をわかりやすく分析します。", "Veja o Nekuma em ação": "Nekumaの画面を見る",
      "Um painel para entender o mês sem abrir banco, calculadora e planilha.": "銀行アプリや電卓、表計算を開かずに、ひとつの画面で毎月の家計を確認できます。",
      "O que torna o Nekuma diferente": "Nekumaの特徴", "Alertas que mostram o que merece sua atenção antes de virar susto.": "問題になる前に、注意すべき変化をお知らせします。",
      "Feito para quem vive entre dois países": "2つの国に暮らしを持つ人のために", "Mora no Japão, mas ainda tem vida financeira no Brasil?": "日本に住みながらブラジルのお金も管理していますか？",
      "Centralizar tudo no Nekuma": "Nekumaでまとめて管理", "O que o Nekuma resolve": "Nekumaでできること", "Organização financeira descomplicada para o mês real.": "毎日の暮らしに合った、わかりやすい家計管理。",
      "Planos": "料金プラン", "7 dias grátis": "7日間無料", "Comece sem compromisso": "気軽にお試し", "Todas as funcionalidades liberadas. Aplicativo sempre atualizado com novas atualizações. Contas familiares sincronizadas, relatórios completos e muito mais.": "すべての機能、継続的なアップデート、詳細レポートなどをご利用いただけます。",
      "Seu dinheiro mais claro": "お金をもっと明確に", "Comece hoje a organizar seu mês com mais clareza.": "今日から毎月の家計をわかりやすく整えましょう。",
      "Política de Privacidade": "プライバシーポリシー", "Termos de Serviço": "利用規約", "Login": "ログイン",
      "Bem-vindo ao Nekuma": "Nekumaへようこそ", "Bem-vindo ao Nekuma.": "Nekumaへようこそ。", "Crie sua conta Nekuma.": "Nekumaアカウントを作成",
      "Recupere sua senha.": "パスワードを再設定", "Acesso seguro": "安全なアクセス", "Entre para acessar sua vida financeira": "ログインして家計を確認しましょう",
      "Conectando ao Nekuma Finance": "Nekuma Financeに接続中", "ou entre com email": "またはメールでログイン", "Senha": "パスワード", "Esqueceu a senha?": "パスワードを忘れた方",
      "Entrar": "ログイン", "Ainda não tem conta?": "アカウントをお持ちでない方", "Cadastre-se": "新規登録", "Continuar com Google": "Googleで続ける",
      "Instalar Nekuma": "Nekumaをインストール", "Acesso direto pelo ícone do app": "アプリアイコンから直接開けます", "Cadastro": "新規登録", "Criar sua conta": "アカウントを作成",
      "Voltar": "戻る", "Nome da família": "家族名", "opcional": "任意", "Código da família": "家族コード", "ou crie com email": "またはメールで作成",
      "Criar login": "アカウントを作成", "Já tem cadastro?": "登録済みの方", "Recuperar senha": "パスワード再設定", "Informe seu email": "メールアドレスを入力",
      "Confira seu email": "メールを確認", "Crie uma nova senha": "新しいパスワードを作成", "Nova senha": "新しいパスワード", "Confirmar nova senha": "新しいパスワード（確認）",
      "Salvar nova senha": "新しいパスワードを保存", "Voltar para login": "ログインに戻る", "Dashboard": "ダッシュボード", "Banking": "口座・給与", "Orcamentos": "予算",
      "Projecoes": "予測", "Cripto": "暗号資産", "Cartoes": "カード", "Patrimonio": "資産", "Extrato": "取引履歴", "Planos": "プラン", "Ajustes": "設定",
      "Pesquisar": "検索", "Inicio": "ホーム", "Menu": "メニュー", "Sair": "ログアウト", "Idioma": "言語", "Portugues": "ポルトガル語", "Japones": "日本語", "Ingles": "英語",
      "Salvar ajustes": "設定を保存", "Ajustes salvos.": "設定を保存しました。", "Escolha o idioma do aplicativo": "アプリの言語を選択", "Você poderá alterar esta opção depois em Ajustes.": "この設定は後から設定画面で変更できます。",
      "Continuar": "続ける", "Aplicando idioma": "言語を適用中", "Confirmar alteração de idioma?": "言語を変更しますか？", "O aplicativo será reiniciado para aplicar o novo idioma.": "新しい言語を適用するため、アプリを再読み込みします。"
    }
  };

  Object.assign(messages["en-US"], {
    "Visao geral de": "Overview for", "Salario previsto": "Expected salary", "Contas": "Accounts", "Subscricoes": "Subscriptions",
    "Calendario de turnos": "Shift calendar", "Reserva de emergencia": "Emergency reserve", "Trabalho e Familia": "Work and family",
    "Investimentos": "Investments", "Graficos e Resumos": "Charts and summaries", "Meus Cartoes": "My cards", "Moradia": "Housing",
    "Metas Financeiras": "Financial goals", "Raio-X familiar": "Family overview", "Gastos totais": "Total spending", "Folego": "Available balance",
    "Salario": "Salary", "Descontos salariais": "Payroll deductions", "Saude": "Health", "Mercado": "Groceries", "Entrou": "Income", "Saiu": "Expenses",
    "Nenhuma subscricao neste mes.": "No subscriptions this month.", "Nenhum cartao cadastrado.": "No cards registered.", "Nenhuma moradia cadastrada.": "No housing registered.",
    "Cadastrar cartao": "Add card", "Cadastrar moradia": "Add housing", "Nova moradia": "New housing", "Nova meta": "New goal", "Novo": "New", "Criar": "Create",
    "Guardado": "Saved", "Falta": "Remaining", "Guardar por mes": "Save per month", "Aporte": "Contribution", "Editar": "Edit", "Excluir": "Delete",
    "Alta prioridade": "High priority", "Media prioridade": "Medium priority", "Baixa prioridade": "Low priority", "Progresso": "Progress",
    "Ajustes": "Settings", "Relatorios": "Reports", "Plano": "Plan", "Paleta do aplicativo": "App color palette", "Escolher": "Choose",
    "Moeda principal": "Primary currency", "Moeda secundaria": "Secondary currency", "Organizacao familiar": "Family organization", "Compartilhado": "Shared",
    "Chefe da familia": "Family administrator", "Perfil do usuario": "User profile", "Pessoal": "Personal", "Pais": "Country", "Cidade": "City", "Idade": "Age", "Sexo": "Gender",
    "Nao informado": "Not specified", "Feminino": "Female", "Masculino": "Male", "Outro": "Other", "Aplicar idioma": "Apply language",
    "O idioma selecionado ja esta ativo.": "The selected language is already active.", "Cotacao automatica": "Automatic exchange rates", "Atualizar cotacao": "Update rates",
    "Real por iene": "Real per yen", "Iene por real": "Yen per real", "Real por dolar": "Real per dollar", "Real por euro": "Real per euro",
    "Convidar amigos": "Invite friends", "Copiar convite": "Copy invitation", "Automacao financeira": "Financial automation", "Regra": "Rule",
    "Radar de recorrencias": "Recurring payment radar", "Possivel recorrencia": "Possible recurrence", "Possivel duplicada": "Possible duplicate", "Aumento": "Increase",
    "Calendario e lembretes": "Calendar and reminders", "Exportar para Google, Apple ou calendario do aparelho": "Export to Google, Apple, or device calendar",
    "Ativar notificacoes": "Enable notifications", "Repetir tutorial": "Repeat tutorial", "Conta vence amanha": "Bill due tomorrow", "Orcamento atingiu 80%": "Budget reached 80%",
    "Fatura fechou": "Statement closed", "Salario previsto divergiu": "Expected salary differs", "Reserva recebeu aporte": "Reserve received a contribution",
    "Importacao precisa de revisao": "Import needs review", "Backup": "Backup", "Exportar dados": "Export data", "Importar backup": "Import backup",
    "Empresas e Rendas": "Companies and income", "Empresa": "Company", "Privacidade": "Privacy", "Protegido": "Protected", "Nuvem": "Cloud", "Online": "Online",
    "Usuarios da familia": "Family users", "Entrar em outra familia": "Join another family", "Conectar familia": "Connect family", "Ultima sincronizacao": "Last synchronization",
    "Excluir cadastro": "Delete account", "Ambiente": "Environment", "Armazenamento": "Storage", "Sincronizacao": "Synchronization", "Resetar dados": "Reset data",
    "Atualizar App": "Update app", "Minha evolucao": "My progress", "Saude financeira": "Financial health", "Em desenvolvimento": "Improving",
    "Atividade financeira": "Financial activity", "Ultimos 6 meses": "Last 6 months", "Dimensoes": "Dimensions", "O que estamos avaliando": "What we evaluate",
    "Planejamento": "Planning", "Contas em dia": "Bills on time", "Organizacao": "Organization", "Consistencia": "Consistency", "Proxima conquista": "Next achievement",
    "Medalhas conquistadas": "Unlocked achievements", "Primeiro Passo": "First Step", "Ver todas": "View all", "Mes em andamento": "Month in progress",
    "Conversor": "Converter", "Atualizado": "Updated", "Total previsto no mes": "Expected total this month", "Nenhuma previsao salarial cadastrada.": "No salary forecast registered.",
    "Detalhamento do salario previsto": "Expected salary details", "Bruto": "Gross", "Descontos": "Deductions", "Liquido previsto": "Expected net",
    "Dashboard PRO para PC e iPad": "PRO dashboard for PC and iPad", "Resumo rapido no celular": "Quick summary on mobile", "Gastos por categoria e folego do mes": "Spending by category and monthly balance",
    "Salario japones sem fazer conta na mao": "Japanese salary without manual calculations", "Iene e real lado a lado": "Yen and real side by side", "Brasil e Japao na mesma vida financeira": "Brazil and Japan in one financial life",
    "Familia no mesmo orcamento": "Family on one budget", "Moradia organizada": "Organized housing", "Cartoes sem surpresa": "Cards without surprises",
    "Assinaturas esquecidas sob controle": "Forgotten subscriptions under control", "Cripto e investimentos": "Crypto and investments", "Scanner de recibos com IA": "AI receipt scanner",
    "Tecnologia Open Finance": "Open Finance technology", "Integracao Web3": "Web3 integration", "Muito mais": "And much more", "Updates": "Updates"
  });

  Object.assign(messages["ja-JP"], {
    "Visao geral de": "家計概要", "Salario previsto": "給与予測", "Contas": "口座", "Subscricoes": "サブスクリプション",
    "Calendario de turnos": "勤務カレンダー", "Reserva de emergencia": "緊急予備資金", "Trabalho e Familia": "仕事と家族",
    "Investimentos": "投資", "Graficos e Resumos": "グラフと概要", "Meus Cartoes": "カード", "Moradia": "住居費",
    "Metas Financeiras": "貯蓄目標", "Raio-X familiar": "家計分析", "Gastos totais": "支出合計", "Folego": "残額",
    "Salario": "給与", "Descontos salariais": "給与控除", "Saude": "健康", "Mercado": "食料品", "Entrou": "収入", "Saiu": "支出",
    "Nenhuma subscricao neste mes.": "今月のサブスクリプションはありません。", "Nenhum cartao cadastrado.": "カードは登録されていません。", "Nenhuma moradia cadastrada.": "住居情報は登録されていません。",
    "Cadastrar cartao": "カードを登録", "Cadastrar moradia": "住居を登録", "Nova moradia": "住居を追加", "Nova meta": "目標を追加", "Novo": "新規", "Criar": "作成",
    "Guardado": "貯蓄済み", "Falta": "残り", "Guardar por mes": "毎月の貯蓄額", "Aporte": "入金", "Editar": "編集", "Excluir": "削除",
    "Alta prioridade": "優先度：高", "Media prioridade": "優先度：中", "Baixa prioridade": "優先度：低", "Progresso": "進捗",
    "Ajustes": "設定", "Relatorios": "レポート", "Plano": "プラン", "Paleta do aplicativo": "アプリの配色", "Escolher": "選択",
    "Moeda principal": "基準通貨", "Moeda secundaria": "比較通貨", "Organizacao familiar": "家族の管理", "Compartilhado": "共有",
    "Chefe da familia": "家族管理者", "Perfil do usuario": "ユーザープロフィール", "Pessoal": "個人", "Pais": "国", "Cidade": "市区町村", "Idade": "年齢", "Sexo": "性別",
    "Nao informado": "未設定", "Feminino": "女性", "Masculino": "男性", "Outro": "その他", "Aplicar idioma": "言語を適用",
    "O idioma selecionado ja esta ativo.": "選択した言語はすでに適用されています。", "Cotacao automatica": "自動為替レート", "Atualizar cotacao": "為替レートを更新",
    "Real por iene": "1円あたりのレアル", "Iene por real": "1レアルあたりの円", "Real por dolar": "1ドルあたりのレアル", "Real por euro": "1ユーロあたりのレアル",
    "Convidar amigos": "友人を招待", "Copiar convite": "招待コードをコピー", "Automacao financeira": "家計の自動化", "Regra": "ルール",
    "Radar de recorrencias": "定期支払いの検出", "Possivel recorrencia": "定期支払いの可能性", "Possivel duplicada": "重複の可能性", "Aumento": "値上げ",
    "Calendario e lembretes": "カレンダーと通知", "Exportar para Google, Apple ou calendario do aparelho": "Google・Apple・端末のカレンダーへ書き出す",
    "Ativar notificacoes": "通知を有効にする", "Repetir tutorial": "チュートリアルを再表示", "Conta vence amanha": "明日が支払期限", "Orcamento atingiu 80%": "予算の80%に到達",
    "Fatura fechou": "請求額が確定", "Salario previsto divergiu": "給与予測に差異あり", "Reserva recebeu aporte": "予備資金に入金あり",
    "Importacao precisa de revisao": "取込データの確認が必要", "Backup": "バックアップ", "Exportar dados": "データを書き出す", "Importar backup": "バックアップを読み込む",
    "Empresas e Rendas": "勤務先と収入", "Empresa": "勤務先", "Privacidade": "プライバシー", "Protegido": "保護済み", "Nuvem": "クラウド", "Online": "オンライン",
    "Usuarios da familia": "家族ユーザー", "Entrar em outra familia": "別の家族に参加", "Conectar familia": "家族に接続", "Ultima sincronizacao": "最終同期",
    "Excluir cadastro": "アカウントを削除", "Ambiente": "アプリ環境", "Armazenamento": "保存先", "Sincronizacao": "同期", "Resetar dados": "データをリセット",
    "Atualizar App": "アプリを更新", "Minha evolucao": "自分の進捗", "Saude financeira": "家計健全度", "Em desenvolvimento": "改善中",
    "Atividade financeira": "家計活動", "Ultimos 6 meses": "直近6か月", "Dimensoes": "評価項目", "O que estamos avaliando": "評価内容",
    "Planejamento": "計画", "Contas em dia": "期限内の支払い", "Organizacao": "整理", "Consistencia": "継続性", "Proxima conquista": "次の実績",
    "Medalhas conquistadas": "獲得した実績", "Primeiro Passo": "はじめの一歩", "Ver todas": "すべて表示", "Mes em andamento": "今月は集計中",
    "Conversor": "通貨換算", "Atualizado": "更新時刻", "Total previsto no mes": "今月の予定合計", "Nenhuma previsao salarial cadastrada.": "給与予測は登録されていません。",
    "Detalhamento do salario previsto": "給与予測の内訳", "Bruto": "総支給", "Descontos": "控除", "Liquido previsto": "手取り予測",
    "Dashboard PRO para PC e iPad": "PC・iPad用PROダッシュボード", "Resumo rapido no celular": "スマートフォン用クイック概要", "Gastos por categoria e folego do mes": "カテゴリ別支出と今月の残額",
    "Salario japones sem fazer conta na mao": "日本の給与を自動計算", "Iene e real lado a lado": "円とレアルを並べて表示", "Brasil e Japao na mesma vida financeira": "日本とブラジルの家計を一元管理",
    "Familia no mesmo orcamento": "家族で共有する予算", "Moradia organizada": "住居費を整理", "Cartoes sem surpresa": "カード請求を事前に把握",
    "Assinaturas esquecidas sob controle": "サブスクリプションを管理", "Cripto e investimentos": "暗号資産と投資", "Scanner de recibos com IA": "AIレシート読取",
    "Tecnologia Open Finance": "Open Finance連携", "Integracao Web3": "Web3連携", "Muito mais": "その他の機能", "Updates": "更新情報",
    "Confirmar recebimento": "給与受取を確認", "Liquido recebido": "実際の手取り額", "Conta de destino": "入金先口座", "Marcar recebido": "受取済みにする",
    "Conciliacao bancaria": "口座照合", "Depois": "後で", "Recebimento conciliado.": "給与を口座に反映しました。"
  });

  Object.assign(messages["en-US"], {
    "Reserva de emergencia": "Emergency reserve", "meses ate completar": "months to complete", "teiji + zangyou + bonus": "base hours + overtime + bonus",
    "Os ¥500 aqui, ¥1.000 ali, assinaturas esquecidas, contas do Brasil e gastos da familia somam mais do que parecem.": "¥500 here, ¥1,000 there, forgotten subscriptions, Brazilian bills, and family expenses add up to more than they seem.",
    "Organizacao financeira descomplicada para entender o mes de verdade.": "Straightforward financial organization to understand your real month.",
    "O Nekuma mostra quanto sobra": "Nekuma shows what remains", "Salario bruto previsto": "Expected gross salary", "Contas a pagar": "Bills to pay", "Pago no mes": "Paid this month",
    "Item": "Item", "Tipo": "Type", "Valor": "Amount", "Entrada": "Income", "Saida": "Expense", "Total": "Total",
    "Seu zangyou mudou o resultado do mes": "Your overtime changed this month's result", "Essas assinaturas estao pesando mais do que parece": "These subscriptions cost more than they seem",
    "A conta da casa veio diferente do normal": "A household bill was different from usual", "Compara o previsto com a rotina de turno, bonus e horas extras para voce entender quanto deve receber.": "Compares the forecast with shifts, bonuses, and overtime so you understand what you should receive.",
    "Mostra Netflix, YouTube, Disney+, Spotify e outros gastos pequenos que se repetem todo mes.": "Shows Netflix, YouTube, Disney+, Spotify, and other small expenses that repeat every month.",
    "Ajuda a enxergar quando agua, luz, gas, aluguel ou cartao saem do padrao da familia.": "Highlights when water, electricity, gas, rent, or card expenses differ from the family's normal pattern.",
    "Salario e contas no Japao": "Salary and accounts in Japan", "Cartoes, metas e compromissos no Brasil": "Cards, goals, and commitments in Brazil", "Iene e real no mesmo painel": "Yen and real in one dashboard",
    "Chega de banco japones + banco brasileiro + calculadora + bloco de notas + planilha. Sucesso financeiro comeca quando tudo fica claro no mesmo lugar.": "No more switching among Japanese banks, Brazilian banks, calculators, notes, and spreadsheets. Financial progress begins when everything is clear in one place.",
    "Veja uma previsao considerando teiji, zangyou, turno diurno, noturno, sabado, domingo e adicionais.": "See a forecast based on regular hours, overtime, day and night shifts, weekends, and premiums.",
    "Saiba quanto tem, quanto deve e quanto esta gastando sem ficar convertendo tudo no Google.": "Know what you have, owe, and spend without converting everything on Google.",
    "Acompanhe contas, cartoes, metas, bancos e compromissos dos dois paises.": "Track accounts, cards, goals, banks, and commitments in both countries.",
    "Veja quanto a casa gasta e onde cada parte do dinheiro esta indo.": "See household spending and where every part of the money goes.",
    "Tenha controle sobre aluguel, luz, gas, agua, internet e outros gastos relacionados.": "Manage rent, electricity, gas, water, internet, and related expenses.",
    "Saiba o valor da proxima fatura antes de ela virar problema no dia do vencimento.": "Know the next statement amount before it becomes a due-date problem.",
    "O Nekuma foi pensado para a sua realidade.": "Nekuma was designed for your reality.", "Ja controlo pelo banco.": "I already use my bank.", "Uso uma planilha.": "I use a spreadsheet.", "Uso outro aplicativo financeiro.": "I use another finance app.",
    "Em breve, ainda mais automacao para sua familia.": "Coming soon: even more automation for your family.",
    "Tire foto do recibo e deixe a IA sugerir mercado, valor, data e categoria.": "Photograph a receipt and let AI suggest the merchant, amount, date, and category.",
    "Teste o aplicativo sem anuncios. Teste suas funcionalidades, se o app se encaixa perfeitamente as suas necessidades e atende as suas expectativas. Quase todas as funcionalidades liberadas.": "Try the app without ads and see whether it fits your needs. Nearly all features are unlocked.",
    "Veja quanto Netflix, YouTube, Disney+ e outras assinaturas realmente custam por mes.": "See what Netflix, YouTube, Disney+, and other subscriptions really cost each month.",
    "Estipule uma meta e prazo, ou deixe o app calcular quanto guardar baseado nos gastos do mes.": "Set a goal and deadline, or let the app calculate how much to save based on monthly spending.",
    "Tenha controle das suas criptos, investimentos, metas e patrimonio em um so lugar.": "Manage crypto, investments, goals, and wealth in one place.",
    "O banco mostra movimentacoes. O Nekuma mostra sua vida financeira: Brasil, Japao, familia, salario previsto, vencimentos e reserva.": "A bank shows transactions. Nekuma shows your financial life across Brazil, Japan, family, expected salary, due dates, and reserves.",
    "A planilha calcula. Voce ainda precisa alimentar, organizar e interpretar tudo. O Nekuma centraliza o mes e apresenta o que importa.": "A spreadsheet calculates, but you still have to feed, organize, and interpret it. Nekuma centralizes the month and shows what matters.",
    "Uma base preparada para conectar contas, cartoes e movimentacoes com mais automacao.": "A foundation prepared to connect accounts, cards, and transactions with more automation.",
    "Carteiras, criptos e patrimonio digital conectados ao planejamento financeiro da familia.": "Wallets, crypto, and digital wealth connected to family financial planning.",
    "Relatorios, cards organizados, negocios familiares e novas formas de enxergar seu dinheiro.": "Reports, organized cards, family businesses, and new ways to understand your money."
  });

  Object.assign(messages["ja-JP"], {
    "Reserva de emergencia": "緊急予備資金", "meses ate completar": "達成までの月数", "teiji + zangyou + bonus": "定時＋残業＋賞与",
    "Os ¥500 aqui, ¥1.000 ali, assinaturas esquecidas, contas do Brasil e gastos da familia somam mais do que parecem.": "少額の買い物、使っていないサブスクリプション、ブラジルの支払い、家族の支出は、積み重なると大きな金額になります。",
    "Organizacao financeira descomplicada para entender o mes de verdade.": "毎月の家計を正しく把握するための、わかりやすい家計管理。",
    "O Nekuma mostra quanto sobra": "Nekumaなら残る金額がわかります", "Salario bruto previsto": "総支給予測", "Contas a pagar": "支払予定", "Pago no mes": "今月支払済み",
    "Item": "項目", "Tipo": "種類", "Valor": "金額", "Entrada": "収入", "Saida": "支出", "Total": "合計",
    "Seu zangyou mudou o resultado do mes": "残業時間が今月の収支を変えました", "Essas assinaturas estao pesando mais do que parece": "サブスクリプションの負担が増えています",
    "A conta da casa veio diferente do normal": "住居費が通常と異なります", "Compara o previsto com a rotina de turno, bonus e horas extras para voce entender quanto deve receber.": "勤務シフト、賞与、残業時間を予測と比較し、受取予定額を確認できます。",
    "Mostra Netflix, YouTube, Disney+, Spotify e outros gastos pequenos que se repetem todo mes.": "Netflix、YouTube、Disney+、Spotifyなど、毎月繰り返す少額支出を表示します。",
    "Ajuda a enxergar quando agua, luz, gas, aluguel ou cartao saem do padrao da familia.": "水道、電気、ガス、家賃、カード利用額が通常と異なる場合に気づけます。",
    "Salario e contas no Japao": "日本の給与と口座", "Cartoes, metas e compromissos no Brasil": "ブラジルのカード・目標・支払い", "Iene e real no mesmo painel": "円とレアルを同じ画面で表示",
    "Chega de banco japones + banco brasileiro + calculadora + bloco de notas + planilha. Sucesso financeiro comeca quando tudo fica claro no mesmo lugar.": "日本とブラジルの銀行、電卓、メモ、表計算を行き来する必要はありません。すべてを一か所で明確に管理できます。",
    "Veja uma previsao considerando teiji, zangyou, turno diurno, noturno, sabado, domingo e adicionais.": "定時、残業、昼勤、夜勤、土日、各種手当を考慮して給与を予測します。",
    "Saiba quanto tem, quanto deve e quanto esta gastando sem ficar convertendo tudo no Google.": "毎回換算せずに、資産・負債・支出を確認できます。",
    "Acompanhe contas, cartoes, metas, bancos e compromissos dos dois paises.": "両国の口座、カード、目標、銀行、支払いをまとめて確認できます。",
    "Veja quanto a casa gasta e onde cada parte do dinheiro esta indo.": "家族の支出額とお金の使い道を確認できます。",
    "Tenha controle sobre aluguel, luz, gas, agua, internet e outros gastos relacionados.": "家賃、電気、ガス、水道、インターネットなどの住居費を管理できます。",
    "Saiba o valor da proxima fatura antes de ela virar problema no dia do vencimento.": "支払日前に次回のカード請求額を確認できます。",
    "O Nekuma foi pensado para a sua realidade.": "Nekumaはあなたの暮らしに合わせて設計されています。", "Ja controlo pelo banco.": "銀行アプリで管理している", "Uso uma planilha.": "表計算を使っている", "Uso outro aplicativo financeiro.": "別の家計アプリを使っている",
    "Em breve, ainda mais automacao para sua familia.": "家族の家計管理をさらに自動化します。",
    "Tire foto do recibo e deixe a IA sugerir mercado, valor, data e categoria.": "レシートを撮影すると、AIが店舗、金額、日付、カテゴリを提案します。",
    "Teste o aplicativo sem anuncios. Teste suas funcionalidades, se o app se encaixa perfeitamente as suas necessidades e atende as suas expectativas. Quase todas as funcionalidades liberadas.": "広告なしでアプリをお試しいただけます。ほぼすべての機能を利用し、自分に合うか確認できます。",
    "Veja quanto Netflix, YouTube, Disney+ e outras assinaturas realmente custam por mes.": "Netflix、YouTube、Disney+などの月額費用を確認できます。",
    "Estipule uma meta e prazo, ou deixe o app calcular quanto guardar baseado nos gastos do mes.": "目標と期限を設定するか、毎月の支出をもとに必要な貯蓄額を自動計算できます。",
    "Tenha controle das suas criptos, investimentos, metas e patrimonio em um so lugar.": "暗号資産、投資、目標、資産を一か所で管理できます。",
    "O banco mostra movimentacoes. O Nekuma mostra sua vida financeira: Brasil, Japao, familia, salario previsto, vencimentos e reserva.": "銀行は取引履歴を表示します。Nekumaは日本とブラジル、家族、給与予測、支払期限、予備資金まで家計全体を表示します。",
    "A planilha calcula. Voce ainda precisa alimentar, organizar e interpretar tudo. O Nekuma centraliza o mes e apresenta o que importa.": "表計算では入力、整理、分析が必要です。Nekumaは毎月の情報をまとめ、重要な内容を表示します。",
    "Uma base preparada para conectar contas, cartoes e movimentacoes com mais automacao.": "口座、カード、取引をより自動的に連携するための基盤です。",
    "Carteiras, criptos e patrimonio digital conectados ao planejamento financeiro da familia.": "ウォレット、暗号資産、デジタル資産を家族の家計計画につなげます。",
    "Relatorios, cards organizados, negocios familiares e novas formas de enxergar seu dinheiro.": "レポート、整理されたカード、家族事業など、お金を把握するための機能を提供します。"
  });

  const sharedTerms = {
    "en-US": {
      "Main": "Home", "Familia": "Family", "Indique e ganhe": "Refer and earn", "Home": "Home", "Pesquisa": "Search", "Orcamento": "Budget", "Orcamentos": "Budgets",
      "Projecoes": "Forecasts", "Previsao": "Forecast", "Cartao": "Card", "Cartoes": "Cards", "Patrimonio": "Wealth", "Extrato": "Transactions", "Planos": "Plans",
      "Receitas": "Income", "Despesas": "Expenses", "Recebimentos": "Income", "Pagamentos": "Payments", "Transferencias": "Transfers", "Categorias": "Categories",
      "Assinaturas": "Subscriptions", "Combini e gastos rapidos": "Convenience stores and quick expenses", "Contas no Brasil": "Accounts in Brazil", "Salario Fabrica": "Factory salary", "Gastos da familia em um so lugar": "Family spending in one place",
      "Supermercado": "Groceries", "Farmacia": "Pharmacy", "Combustivel": "Fuel", "Internet e telefone": "Internet and phone", "Transporte": "Transport", "Roupas": "Clothing", "Restaurante": "Restaurant", "Casa": "Home", "Filhos": "Children", "Outros": "Other",
      "Dia": "Day", "Noite": "Night", "Folga": "Day off", "Dom": "Sun", "Seg": "Mon", "Ter": "Tue", "Qua": "Wed", "Qui": "Thu", "Sex": "Fri", "Sab": "Sat",
      "Janeiro": "January", "Fevereiro": "February", "Marco": "March", "Abril": "April", "Maio": "May", "Junho": "June", "Julho": "July", "Agosto": "August", "Setembro": "September", "Outubro": "October", "Novembro": "November", "Dezembro": "December",
      "Ativo": "Active", "Ativa": "Active", "Inativo": "Inactive", "Pago": "Paid", "Pendente": "Pending", "Confirmar": "Confirm", "Cancelar": "Cancel", "Fechar": "Close", "Salvar": "Save", "Adicionar": "Add", "Configurar": "Configure", "Sincronizar": "Synchronize",
      "Nome": "Name", "Data": "Date", "Categoria": "Category", "Descricao": "Description", "Observacao": "Note", "Opcional": "Optional", "Forma de pagamento": "Payment method", "Conta bancaria": "Bank account", "Conta": "Account", "Banco": "Bank", "Saldo": "Balance", "Moeda": "Currency",
      "Dono": "Owner", "Voce": "You", "Membros": "Members", "Pessoa": "Person", "Recebido": "Received", "Previsto": "Expected", "Disponivel": "Available", "Objetivo": "Goal"
      ,"Cadastrar": "Add", "Atualizar": "Update", "Reserva": "Reserve", "Meta": "Goal", "Veiculo": "Vehicle", "Contrato": "Contract", "Consorcio": "Consortium", "Controle": "Tracker", "Cripto": "Crypto", "Categoria": "Category", "Simulacao": "Simulation", "Compra": "Purchase", "Conta bancaria": "Bank account", "Transferencia": "Transfer", "Recebimento": "Income", "Evento financeiro": "Financial event", "Lancamento": "Transaction", "Gasto": "Expense", "Investimento": "Investment", "Divida": "Debt", "Financiamento": "Loan", "Hoje": "Today"
    },
    "ja-JP": {
      "Main": "ホーム", "Familia": "家族", "Indique e ganhe": "紹介特典", "Home": "ホーム", "Pesquisa": "検索", "Orcamento": "予算", "Orcamentos": "予算",
      "Projecoes": "予測", "Previsao": "予測", "Cartao": "カード", "Cartoes": "カード", "Patrimonio": "資産", "Extrato": "取引履歴", "Planos": "プラン",
      "Receitas": "収入", "Despesas": "支出", "Recebimentos": "入金", "Pagamentos": "支払い", "Transferencias": "振替", "Categorias": "カテゴリ",
      "Assinaturas": "サブスクリプション", "Combini e gastos rapidos": "コンビニ・日常支出", "Contas no Brasil": "ブラジルの口座", "Salario Fabrica": "工場給与", "Gastos da familia em um so lugar": "家族の支出を一か所で管理",
      "Supermercado": "スーパー", "Farmacia": "薬局", "Combustivel": "燃料", "Internet e telefone": "通信費", "Transporte": "交通", "Roupas": "衣類", "Restaurante": "外食", "Casa": "住居", "Filhos": "子ども", "Outros": "その他",
      "Dia": "昼勤", "Noite": "夜勤", "Folga": "休日", "Dom": "日", "Seg": "月", "Ter": "火", "Qua": "水", "Qui": "木", "Sex": "金", "Sab": "土",
      "Janeiro": "1月", "Fevereiro": "2月", "Marco": "3月", "Abril": "4月", "Maio": "5月", "Junho": "6月", "Julho": "7月", "Agosto": "8月", "Setembro": "9月", "Outubro": "10月", "Novembro": "11月", "Dezembro": "12月",
      "Ativo": "有効", "Ativa": "有効", "Inativo": "無効", "Pago": "支払済み", "Pendente": "未処理", "Confirmar": "確認", "Cancelar": "キャンセル", "Fechar": "閉じる", "Salvar": "保存", "Adicionar": "追加", "Configurar": "設定", "Sincronizar": "同期",
      "Nome": "名前", "Data": "日付", "Categoria": "カテゴリ", "Descricao": "説明", "Observacao": "メモ", "Opcional": "任意", "Forma de pagamento": "支払方法", "Conta bancaria": "銀行口座", "Conta": "口座", "Banco": "銀行", "Saldo": "残高", "Moeda": "通貨",
      "Dono": "管理者", "Voce": "あなた", "Membros": "メンバー", "Pessoa": "メンバー", "Recebido": "受取済み", "Previsto": "予定", "Disponivel": "利用可能", "Objetivo": "目標"
      ,"Cadastrar": "登録", "Atualizar": "更新", "Reserva": "予備資金", "Meta": "目標", "Veiculo": "車両", "Contrato": "契約", "Consorcio": "コンソーシアム", "Controle": "管理項目", "Cripto": "暗号資産", "Categoria": "カテゴリ", "Simulacao": "シミュレーション", "Compra": "購入", "Conta bancaria": "銀行口座", "Transferencia": "振替", "Recebimento": "入金", "Evento financeiro": "家計イベント", "Lancamento": "取引", "Gasto": "支出", "Investimento": "投資", "Divida": "負債", "Financiamento": "ローン", "Hoje": "今日"
    }
  };

  Object.entries(sharedTerms).forEach(([locale, dictionary]) => Object.assign(messages[locale], dictionary));

  Object.assign(messages["en-US"], {
    "Escolher mes do dashboard": "Choose dashboard month", "Cadastre uma fonte de renda": "Add an income source", "Valor para converter no dashboard": "Amount to convert on dashboard",
    "Adicionar primeira conta": "Add first account", "Meta estipulada": "Defined goal", "Pessoas e gastos de Outubro de 2026.": "People and spending for October 2026.",
    "Gastos": "Expenses", "Orcamento mensal": "Monthly budget", "Defina limites para acompanhar o mes.": "Set limits to track the month.", "Criar orcamento": "Create budget",
    "Nenhum evento financeiro neste mes.": "No financial events this month.", "Nenhum lancamento neste mes.": "No transactions this month.", "Reservas, objetivos e planos da familia": "Family reserves, goals, and plans",
    "Crie sua primeira meta": "Create your first goal", "Use modelos prontos como reserva de emergencia, viagem, imovel ou cadastre uma meta particular.": "Use templates for an emergency reserve, trip, property, or create a custom goal.",
    "Nenhuma cripto em carteira": "No crypto in the portfolio", "Nenhum gasto lancado neste mes.": "No expenses recorded this month.", "Salario previsto menos gastos mensais dos proximos 6 meses.": "Expected salary minus monthly expenses for the next 6 months.",
    "Menor saldo previsto": "Lowest expected balance", "Salario medio": "Average salary", "Gastos medios": "Average expenses", "Comparativo do mes": "Monthly comparison", "Resumo do mes, saldos e evolucao financeira.": "Monthly summary, balances, and financial progress.",
    "Contas e rendas": "Accounts and income", "Cadastre onde o dinheiro entra, acompanhe saldos e mantenha o vinculo entre empresa, salario e conta de recebimento.": "Add where money arrives, track balances, and link employer, salary, and receiving account.",
    "Contas ativas": "Active accounts", "Fontes de renda": "Income sources", "Contas bancarias": "Bank accounts", "Saldos, banco, pais e conta principal.": "Balances, bank, country, and primary account.",
    "Nenhuma conta bancaria cadastrada ainda.": "No bank account registered yet.", "A conta de recebimento e obrigatoria para salarios.": "A receiving account is required for salaries.", "Nenhuma empresa cadastrada.": "No company registered.",
    "Pagamentos do mes": "Monthly payments", "Cadastre uma empresa em Ajustes antes de adicionar recebimentos.": "Add a company in Settings before adding income.", "Ir para ajustes": "Go to settings", "Contas BR do mes": "Brazilian accounts this month",
    "Financiamentos, consorcio, cartao e reservas": "Loans, consortium, cards, and reserves", "Valor que entrou no Brasil": "Amount received in Brazil", "Ponte do mes atual": "Current month bridge", "0 no mes": "0 this month", "Nenhuma transferencia neste mes.": "No transfers this month.",
    "Defina os limites do mes e acompanhe separadamente o que ja foi pago e o que ainda esta comprometido.": "Set monthly limits and separately track what was paid and what remains committed.", "Copiar mes anterior": "Copy previous month", "Limite do mes": "Monthly limit", "Ja pago": "Already paid",
    "Crie seu primeiro orcamento": "Create your first budget", "Comece por alimentacao, transporte, moradia ou uma categoria criada por voce.": "Start with food, transport, housing, or a custom category.",
    "Compare o caminho atual com compras, mudancas de renda, reducoes de gastos e novos objetivos sem alterar os lancamentos reais.": "Compare the current path with purchases, income changes, spending reductions, and new goals without changing actual transactions.", "Nao previsto": "Not expected", "Mes": "Month",
    "Valor total estimado": "Estimated total value", "Nenhum ativo encontrado": "No asset found", "Nenhuma compra cadastrada": "No purchase registered", "Use Nova cripto para registrar uma compra e formar o historico.": "Use New crypto to register a purchase and build its history.",
    "Cartoes de credito": "Credit cards", "Acompanhe o ciclo completo da compra, do comprometimento do orcamento ate a conciliacao do pagamento.": "Track the full purchase cycle, from budget commitment to payment reconciliation.", "Cartoes ativos": "Active cards", "Faturas do mes": "Statements this month", "Cadastre seu primeiro cartao": "Add your first card",
    "Valor cadastrado": "Registered value", "Compara obrigacoes, pagamentos, contas bancarias, recibos e faturas do mes.": "Compare obligations, payments, bank accounts, receipts, and monthly statements.",
    "Nenhuma divergencia relevante": "No relevant discrepancy", "As verificacoes automaticas deste mes estao em ordem.": "This month's automatic checks are in order.", "Nenhuma obrigacao pendente.": "No pending obligation.", "Agenda do mes": "Monthly schedule", "Mes a mes": "Month by month", "Gastos por categoria": "Spending by category",
    "Recibos do mes": "Receipts this month", "Nenhum recibo neste mes": "No receipts this month", "Use o scan para guardar o comprovante e criar ou conciliar a despesa.": "Use scan to save the receipt and create or reconcile the expense.", "Rendas do mes": "Income this month", "Nenhum recebimento neste mes.": "No income this month.", "Veiculo no mes": "Vehicle this month", "Nenhum custo de veiculo neste mes.": "No vehicle costs this month.",
    "Um espaco protegido para organizar a familia.": "A protected space to organize the family.", "Conecte sua familia na nuvem para gerar um codigo de convite.": "Connect your family to the cloud to generate an invitation code.",
    "As regras nativas ja reconhecem AEON, Valor Drug, Seven, ENEOS, NTT e SoftBank.": "Built-in rules already recognize AEON, Valor Drug, Seven, ENEOS, NTT, and SoftBank.", "Dados financeiros ficam vinculados apenas a sua familia. Chaves sensiveis continuam fora do navegador.": "Financial data stays linked only to your family. Sensitive keys remain outside the browser.",
    "Cadastre contas e movimentacoes para iniciar sua evolucao.": "Add accounts and transactions to begin tracking your progress."
    ,"Use “Nova cripto” para registrar uma compra e formar o historico.": "Use “New crypto” to register a purchase and build its history."
    ,"A receber": "Receivable", "Atualizando": "Updating", "Abrir": "Open", "Abrir Cripto": "Open Crypto", "Abrir projecoes": "Open forecasts", "Acompanhe a carta e a evolucao das parcelas.": "Track the consortium credit and installment progress.", "Controles": "Trackers", "Cadastre uma fabrica para gerar sua escala.": "Add a factory to generate your shift schedule.", "Calendario financeiro": "Financial calendar", "Carteira cripto": "Crypto portfolio", "Clientes, vencimentos e tabelas personalizadas.": "Clients, due dates, and custom tables.", "Comece com streaming, MEI, servicos, vendas ou monte uma tabela livre.": "Start with streaming, small business, services, sales, or create a custom table.", "Consorcios": "Consortiums", "Criar primeiro controle": "Create first tracker", "Crie um controle para o seu proposito": "Create a tracker for your purpose", "Estimativa baseada nos saldos atuais e nos lancamentos recorrentes cadastrados.": "Estimate based on current balances and registered recurring transactions.", "Financiamentos": "Loans", "Grafico mensal": "Monthly chart", "Negocios e Controles": "Businesses and trackers", "Os ativos cadastrados ou conectados aparecerao aqui.": "Registered or connected assets will appear here.", "Planeje antes de gastar": "Plan before spending", "Projecao do saldo para os proximos seis meses": "Balance forecast for the next six months", "Projecoes de saldo": "Balance forecasts", "Realizado e comprometido por categoria.": "Actual and committed amounts by category.", "Ultimos lancamentos": "Recent transactions", "Vencimentos": "Due dates", "Veiculo Japao": "Vehicle in Japan", "Nao consegui atualizar as cotacoes agora.": "Exchange rates could not be updated now."
  });

  Object.assign(messages["ja-JP"], {
    "Escolher mes do dashboard": "ダッシュボードの月を選択", "Cadastre uma fonte de renda": "収入源を登録してください", "Valor para converter no dashboard": "換算する金額",
    "Adicionar primeira conta": "最初の口座を追加", "Meta estipulada": "設定目標", "Pessoas e gastos de Outubro de 2026.": "2026年10月の家族と支出。",
    "Gastos": "支出", "Orcamento mensal": "月間予算", "Defina limites para acompanhar o mes.": "上限を設定して今月の支出を管理します。", "Criar orcamento": "予算を作成",
    "Nenhum evento financeiro neste mes.": "今月の家計イベントはありません。", "Nenhum lancamento neste mes.": "今月の取引はありません。", "Reservas, objetivos e planos da familia": "家族の予備資金・目標・計画",
    "Crie sua primeira meta": "最初の目標を作成", "Use modelos prontos como reserva de emergencia, viagem, imovel ou cadastre uma meta particular.": "緊急予備資金、旅行、不動産などのテンプレート、または独自の目標を利用できます。",
    "Nenhuma cripto em carteira": "暗号資産はありません", "Nenhum gasto lancado neste mes.": "今月の支出は登録されていません。", "Salario previsto menos gastos mensais dos proximos 6 meses.": "今後6か月の給与予測から月間支出を差し引きます。",
    "Menor saldo previsto": "予測最低残高", "Salario medio": "平均給与", "Gastos medios": "平均支出", "Comparativo do mes": "月間比較", "Resumo do mes, saldos e evolucao financeira.": "今月の概要、残高、家計の推移。",
    "Contas e rendas": "口座と収入", "Cadastre onde o dinheiro entra, acompanhe saldos e mantenha o vinculo entre empresa, salario e conta de recebimento.": "入金先を登録し、残高と勤務先・給与・受取口座の連携を管理します。",
    "Contas ativas": "有効な口座", "Fontes de renda": "収入源", "Contas bancarias": "銀行口座", "Saldos, banco, pais e conta principal.": "残高、銀行、国、メイン口座。",
    "Nenhuma conta bancaria cadastrada ainda.": "銀行口座はまだ登録されていません。", "A conta de recebimento e obrigatoria para salarios.": "給与には受取口座の登録が必要です。", "Nenhuma empresa cadastrada.": "勤務先は登録されていません。",
    "Pagamentos do mes": "今月の支払い", "Cadastre uma empresa em Ajustes antes de adicionar recebimentos.": "入金を追加する前に設定で勤務先を登録してください。", "Ir para ajustes": "設定へ", "Contas BR do mes": "今月のブラジル口座",
    "Financiamentos, consorcio, cartao e reservas": "ローン・コンソーシアム・カード・予備資金", "Valor que entrou no Brasil": "ブラジルでの入金額", "Ponte do mes atual": "今月の送金状況", "0 no mes": "今月0件", "Nenhuma transferencia neste mes.": "今月の振替はありません。",
    "Defina os limites do mes e acompanhe separadamente o que ja foi pago e o que ainda esta comprometido.": "月間上限を設定し、支払済みと支払予定を分けて確認します。", "Copiar mes anterior": "前月をコピー", "Limite do mes": "月間上限", "Ja pago": "支払済み",
    "Crie seu primeiro orcamento": "最初の予算を作成", "Comece por alimentacao, transporte, moradia ou uma categoria criada por voce.": "食費、交通費、住居費、または独自カテゴリから始めましょう。",
    "Compare o caminho atual com compras, mudancas de renda, reducoes de gastos e novos objetivos sem alterar os lancamentos reais.": "実際の取引を変更せず、購入、収入変化、支出削減、新しい目標を比較できます。", "Nao previsto": "予定外", "Mes": "月",
    "Valor total estimado": "推定総額", "Nenhum ativo encontrado": "資産が見つかりません", "Nenhuma compra cadastrada": "購入履歴はありません", "Use Nova cripto para registrar uma compra e formar o historico.": "「暗号資産を追加」から購入を登録し、履歴を作成してください。",
    "Cartoes de credito": "クレジットカード", "Acompanhe o ciclo completo da compra, do comprometimento do orcamento ate a conciliacao do pagamento.": "予算への反映から支払い照合まで、購入の全体を管理します。", "Cartoes ativos": "有効なカード", "Faturas do mes": "今月の請求", "Cadastre seu primeiro cartao": "最初のカードを登録",
    "Valor cadastrado": "登録額", "Compara obrigacoes, pagamentos, contas bancarias, recibos e faturas do mes.": "今月の支払予定、支払い、銀行口座、レシート、カード請求を比較します。",
    "Nenhuma divergencia relevante": "重要な差異はありません", "As verificacoes automaticas deste mes estao em ordem.": "今月の自動チェックに問題はありません。", "Nenhuma obrigacao pendente.": "未処理の支払予定はありません。", "Agenda do mes": "今月の予定", "Mes a mes": "月別推移", "Gastos por categoria": "カテゴリ別支出",
    "Recibos do mes": "今月のレシート", "Nenhum recibo neste mes": "今月のレシートはありません", "Use o scan para guardar o comprovante e criar ou conciliar a despesa.": "スキャンでレシートを保存し、支出の登録または照合ができます。", "Rendas do mes": "今月の収入", "Nenhum recebimento neste mes.": "今月の入金はありません。", "Veiculo no mes": "今月の車両費", "Nenhum custo de veiculo neste mes.": "今月の車両費はありません。",
    "Um espaco protegido para organizar a familia.": "家族の家計を整理する安全なスペースです。", "Conecte sua familia na nuvem para gerar um codigo de convite.": "家族をクラウドに接続して招待コードを発行します。",
    "As regras nativas ja reconhecem AEON, Valor Drug, Seven, ENEOS, NTT e SoftBank.": "標準ルールはAEON、Valor Drug、Seven、ENEOS、NTT、SoftBankを認識します。", "Dados financeiros ficam vinculados apenas a sua familia. Chaves sensiveis continuam fora do navegador.": "家計データは家族だけに紐づき、機密キーはブラウザに保存されません。",
    "Cadastre contas e movimentacoes para iniciar sua evolucao.": "口座と取引を登録して家計の進捗を開始してください。"
    ,"Use “Nova cripto” para registrar uma compra e formar o historico.": "「暗号資産を追加」から購入を登録し、履歴を作成してください。"
    ,"A receber": "入金予定", "Atualizando": "更新中", "Abrir": "開く", "Abrir Cripto": "暗号資産を開く", "Abrir projecoes": "予測を開く", "Acompanhe a carta e a evolucao das parcelas.": "コンソーシアムの信用額と分割払いの進捗を確認します。", "Controles": "管理項目", "Cadastre uma fabrica para gerar sua escala.": "勤務先を登録すると勤務表を作成できます。", "Calendario financeiro": "家計カレンダー", "Carteira cripto": "暗号資産ポートフォリオ", "Clientes, vencimentos e tabelas personalizadas.": "顧客、支払期限、カスタム表。", "Comece com streaming, MEI, servicos, vendas ou monte uma tabela livre.": "サブスクリプション、個人事業、サービス、販売、または自由な表から始められます。", "Consorcios": "コンソーシアム", "Criar primeiro controle": "最初の管理項目を作成", "Crie um controle para o seu proposito": "目的に合う管理項目を作成", "Estimativa baseada nos saldos atuais e nos lancamentos recorrentes cadastrados.": "現在の残高と登録済みの定期取引に基づく予測です。", "Financiamentos": "ローン", "Grafico mensal": "月間グラフ", "Negocios e Controles": "事業と管理項目", "Os ativos cadastrados ou conectados aparecerao aqui.": "登録または接続した資産がここに表示されます。", "Planeje antes de gastar": "使う前に計画", "Projecao do saldo para os proximos seis meses": "今後6か月の残高予測", "Projecoes de saldo": "残高予測", "Realizado e comprometido por categoria.": "カテゴリ別の実績額と確定額。", "Ultimos lancamentos": "最近の取引", "Vencimentos": "支払期限", "Veiculo Japao": "日本の車両", "Nao consegui atualizar as cotacoes agora.": "現在、為替レートを更新できませんでした。"
  });

  Object.assign(messages["en-US"], {
    "Pular": "Skip", "Hoje": "Today", "COTACAO EFETIVA": "EFFECTIVE RATE", "Cobertura Brasil": "Brazil coverage", "Diferenca": "Difference",
    "ENVIADO DO JAPAO": "SENT FROM JAPAN", "Historico Wise": "Wise history", "Japao e Brasil": "Japan and Brazil", "RECEBIDO NO BRASIL": "RECEIVED IN BRAZIL",
    "SALDO BANCARIO": "BANK BALANCE", "Sobra": "Remaining", "TAXAS": "FEES", "Transferencias Wise": "Wise transfers", "Wise recebido": "Wise received",
    "consolidado": "consolidated", "empresas e trabalhos": "companies and jobs", "categorias": "categories", "COMPROMETIDO": "COMMITTED",
    "DISPONIVEL PROJETADO": "PROJECTED AVAILABLE", "O comprometido inclui faturas e obrigacoes ainda em aberto.": "Committed amounts include statements and obligations that are still open.",
    "Planejamento por categoria": "Planning by category", "confirmado": "confirmed", "estimado": "estimated", "A simulacao nunca altera seus saldos ou lancamentos.": "A simulation never changes your balances or transactions.",
    "Baixa": "Low", "CONFIANCA": "CONFIDENCE", "Cenarios": "Scenarios", "Confianca da previsao": "Forecast confidence", "Crie uma simulacao para comparar com seu caminho atual.": "Create a simulation to compare with your current path.",
    "Detalhamento mensal": "Monthly details", "Impacto acumulado": "Accumulated impact", "Linha do tempo financeira": "Financial timeline", "Rascunhos separados da contabilidade.": "Drafts remain separate from accounting.",
    "Risco de saldo negativo": "Risk of negative balance", "SAIDAS": "EXPENSES", "SALDO SIMULADO": "SIMULATED BALANCE", "Saldo acumulado atual versus simulado.": "Current accumulated balance versus simulated.",
    "Saldo em 12 meses": "Balance in 12 months", "Saldo simulado": "Simulated balance", "Seu futuro financeiro, antes das decisoes": "Your financial future, before making decisions",
    "Teste uma decisao": "Test a decision", "cenario atual": "current scenario", "em 12 meses": "in 12 months", "sem simulacao": "without simulation",
    "operacoes": "transactions", "Atualizando...": "Updating...", "Conecte uma carteira ou cadastre uma cripto para montar sua visão detalhada.": "Connect a wallet or add crypto to build your detailed view.",
    "Detalhamento Cripto": "Crypto details", "Em carteira": "In wallet", "Fonte: CoinGecko · Dados informativos": "Source: CoinGecko · Informational data", "Ganhos e perdas de hoje": "Today's gains and losses",
    "HISTÓRICO DE COMPRAS E CUSTÓDIA": "PURCHASE AND CUSTODY HISTORY", "Maiores altas": "Top gainers", "Melhor desempenho em 24h": "Best performance in 24h", "Memecoins": "Memecoins",
    "Memes em alta nas últimas 24h": "Trending memes in the last 24h", "Novas": "New", "O gráfico aparecerá após a atualização das cotações.": "The chart will appear after rates are updated.",
    "PORTFÓLIO CONSOLIDADO": "CONSOLIDATED PORTFOLIO", "Populares": "Popular", "Posições manuais, MetaMask e Binance.": "Manual positions, MetaMask, and Binance.", "Principais do mercado": "Market leaders",
    "Registros informados pelo usuário. Conexões de carteira não fornecem automaticamente o preço original de compra.": "User-provided records. Wallet connections do not automatically provide the original purchase price.",
    "COMPRAS REGISTRADAS": "REGISTERED PURCHASES", "COMPROMISSOS FUTUROS": "FUTURE COMMITMENTS", "Depois, compras, parcelas e faturas aparecerao nesta central.": "Purchases, installments, and statements will then appear here.",
    "Parcelas e faturas": "Installments and statements", "cadastrados": "registered", "historico completo": "complete history", "Centralize metas, investimentos, financiamentos e consorcios sem sobrecarregar o dashboard.": "Centralize goals, investments, loans, and consortiums without overloading the dashboard.",
    "DIVIDAS ABERTAS": "OPEN DEBTS", "INVESTIDO": "INVESTED", "METAS ATIVAS": "ACTIVE GOALS", "Planos de longo prazo": "Long-term plans", "emergencia": "emergency", "objetivos em andamento": "goals in progress", "saldo devedor": "outstanding balance",
    "conciliados": "reconciled", "Brasil x Japao": "Brazil vs. Japan", "CONCILIADOS": "RECONCILED", "Central de conciliação": "Reconciliation center", "Comprovantes revisados e vinculados ao financeiro.": "Receipts reviewed and linked to finances.",
    "Convertido em JPY": "Converted to JPY", "DIVERGÊNCIAS": "DISCREPANCIES", "ENTRADAS": "INCOME", "FONTE ÚNICA DE STATUS": "SINGLE STATUS SOURCE", "PENDENTES": "PENDING", "Relatorios - Global em JPY": "Reports - Global in JPY", "SALDO ATUAL": "CURRENT BALANCE", "SUGESTÕES": "SUGGESTIONS",
    "Acesso orientado por permissoes.": "Permission-based access.", "Base preparada para assinatura, limites de uso e beneficios.": "Foundation prepared for subscriptions, usage limits, and benefits.", "Beneficios familiares": "Family benefits",
    "Codigo e creditos promocionais.": "Promotional codes and credits.", "Controle de plano": "Plan management", "Dados preservados": "Data preserved", "Em breve": "Coming soon", "Escolha o nivel certo para sua rotina": "Choose the right level for your routine",
    "Estrutura inicial": "Initial structure", "Gratis": "Free", "Indicacoes": "Referrals", "Mais analise e automacao para a rotina individual.": "More analysis and automation for individual routines.", "Nivel ativo visivel no perfil.": "Active level visible in your profile.",
    "Organizacao financeira essencial para comecar.": "Essential financial organization to get started.", "Os dados continuam seus em qualquer plano. Valores e cobranca serao definidos antes da liberacao comercial.": "Your data remains yours on every plan. Pricing and billing will be defined before commercial release.",
    "PLANOS NEKUMA": "NEKUMA PLANS", "Plano atual": "Current plan", "RECOMENDADO": "RECOMMENDED", "Recursos comerciais": "Commercial features", "Registrar interesse": "Register interest", "Trocar de plano nao apaga historico.": "Changing plans does not delete history.", "para sempre": "forever", "sem cobranca nesta etapa": "no charge at this stage",
    "ativos": "active", "AGO": "AUG", "Ainda nao ha historico mensal suficiente para detectar assinaturas, aumentos ou duplicidades.": "There is not enough monthly history yet to detect subscriptions, increases, or duplicates.",
    "Aparece entre parenteses como comparativo. Nao pode ser igual a principal.": "Shown in parentheses for comparison. It cannot match the primary currency.", "Categorias e recorrencias aprendidas com seus lancamentos.": "Categories and recurring items learned from your transactions.",
    "Fallback": "Fallback", "JUL": "JUL", "JUN": "JUN", "Local": "Local", "MAI": "MAY", "Navegador deste dispositivo": "This device's browser", "Nivel 1 · Organizador": "Level 1 · Organizer", "OUT": "OCT",
    "Opcao para solicitar exclusao definitiva do cadastro e dos dados associados.": "Option to permanently delete the account and associated data.", "Plano Free": "Free plan", "Registre e categorize suas primeiras movimentacoes.": "Record and categorize your first transactions.",
    "Responsavel principal e pagador padrao para novas moradias.": "Primary administrator and default payer for new housing.", "SET": "SEP", "Suas conquistas aparecerao aqui.": "Your achievements will appear here.",
    "Ultima Wise cadastrada - Sem cotacao online recente. Transferencias Wise continuam salvando a cotacao real usada.": "Latest Wise entry - No recent online rate. Wise transfers continue saving the actual rate used.",
    "Usada nos saldos, graficos e relatorios.": "Used in balances, charts, and reports.", "Vencimentos, faturas, metas, shaken, seguros e pagamentos importantes.": "Due dates, statements, goals, shaken inspections, insurance, and important payments.",
    "medalhas": "achievements", "meses ativos": "active months", "pontos": "points",
    "Como está o mercado hoje?": "How is the market today?", "Tudo do Free": "Everything in Free", "Tudo do Plus": "Everything in Plus", "Leitura de recibos quando lancada": "Receipt scanning when released", "Familia - Membro": "Family - Member", "Pronto para conectar Supabase": "Ready to connect Supabase"
  });

  Object.assign(messages["ja-JP"], {
    "Pular": "スキップ", "Hoje": "今日", "COTACAO EFETIVA": "実効為替レート", "Cobertura Brasil": "ブラジル側の充当", "Diferenca": "差額",
    "ENVIADO DO JAPAO": "日本から送金", "Historico Wise": "Wise履歴", "Japao e Brasil": "日本とブラジル", "RECEBIDO NO BRASIL": "ブラジルで受取",
    "SALDO BANCARIO": "銀行残高", "Sobra": "残り", "TAXAS": "手数料", "Transferencias Wise": "Wise送金", "Wise recebido": "Wise受取額", "consolidado": "統合", "empresas e trabalhos": "勤務先と仕事",
    "categorias": "カテゴリ", "COMPROMETIDO": "確定支出", "DISPONIVEL PROJETADO": "利用可能見込額", "O comprometido inclui faturas e obrigacoes ainda em aberto.": "確定支出には未払いの請求と支払予定が含まれます。", "Planejamento por categoria": "カテゴリ別予算",
    "confirmado": "確定", "estimado": "推定", "A simulacao nunca altera seus saldos ou lancamentos.": "シミュレーションは実際の残高や取引を変更しません。", "Baixa": "低", "CONFIANCA": "信頼度", "Cenarios": "シナリオ", "Confianca da previsao": "予測の信頼度",
    "Crie uma simulacao para comparar com seu caminho atual.": "シミュレーションを作成して現在の計画と比較できます。", "Detalhamento mensal": "月別詳細", "Impacto acumulado": "累積影響", "Linha do tempo financeira": "家計タイムライン", "Rascunhos separados da contabilidade.": "下書きは実際の家計記録と分けて保存されます。",
    "Risco de saldo negativo": "残高不足のリスク", "SAIDAS": "支出", "SALDO SIMULADO": "シミュレーション残高", "Saldo acumulado atual versus simulado.": "現在とシミュレーションの累積残高。", "Saldo em 12 meses": "12か月後の残高", "Saldo simulado": "シミュレーション残高",
    "Seu futuro financeiro, antes das decisoes": "決める前に将来の家計を確認", "Teste uma decisao": "計画を試す", "cenario atual": "現在のシナリオ", "em 12 meses": "12か月後", "sem simulacao": "シミュレーションなし",
    "operacoes": "取引", "Atualizando...": "更新中…", "Conecte uma carteira ou cadastre uma cripto para montar sua visão detalhada.": "ウォレットを接続するか暗号資産を登録して詳細を確認できます。", "Detalhamento Cripto": "暗号資産の詳細", "Em carteira": "保有中",
    "Fonte: CoinGecko · Dados informativos": "出典：CoinGecko・参考情報", "Ganhos e perdas de hoje": "本日の損益", "HISTÓRICO DE COMPRAS E CUSTÓDIA": "購入・保管履歴", "Maiores altas": "上昇率上位", "Melhor desempenho em 24h": "24時間の最高パフォーマンス", "Memecoins": "ミームコイン", "Memes em alta nas últimas 24h": "過去24時間で注目のミーム", "Novas": "新着",
    "O gráfico aparecerá após a atualização das cotações.": "価格更新後にグラフが表示されます。", "PORTFÓLIO CONSOLIDADO": "統合ポートフォリオ", "Populares": "人気", "Posições manuais, MetaMask e Binance.": "手動登録、MetaMask、Binanceの保有状況。", "Principais do mercado": "主要銘柄", "Registros informados pelo usuário. Conexões de carteira não fornecem automaticamente o preço original de compra.": "ユーザーが入力した記録です。ウォレット接続では購入時の価格を自動取得できません。",
    "COMPRAS REGISTRADAS": "登録済み購入", "COMPROMISSOS FUTUROS": "今後の支払予定", "Depois, compras, parcelas e faturas aparecerao nesta central.": "購入、分割払い、請求がこの画面に表示されます。", "Parcelas e faturas": "分割払いと請求", "cadastrados": "登録済み", "historico completo": "全履歴",
    "Centralize metas, investimentos, financiamentos e consorcios sem sobrecarregar o dashboard.": "目標、投資、ローン、コンソーシアムをまとめて管理します。", "DIVIDAS ABERTAS": "未返済債務", "INVESTIDO": "投資額", "METAS ATIVAS": "進行中の目標", "Planos de longo prazo": "長期計画", "emergencia": "緊急用", "objetivos em andamento": "進行中の目標", "saldo devedor": "残債",
    "conciliados": "照合済み", "Brasil x Japao": "ブラジル対日本", "CONCILIADOS": "照合済み", "Central de conciliação": "照合センター", "Comprovantes revisados e vinculados ao financeiro.": "確認済みの証憑を家計記録に紐付けます。", "Convertido em JPY": "円換算", "DIVERGÊNCIAS": "差異", "ENTRADAS": "収入", "FONTE ÚNICA DE STATUS": "統一ステータス", "PENDENTES": "未処理", "Relatorios - Global em JPY": "レポート・円換算", "SALDO ATUAL": "現在残高", "SUGESTÕES": "提案",
    "Acesso orientado por permissoes.": "権限に応じたアクセス。", "Base preparada para assinatura, limites de uso e beneficios.": "サブスクリプション、利用制限、特典に対応する基盤。", "Beneficios familiares": "家族向け特典", "Codigo e creditos promocionais.": "紹介コードと特典。", "Controle de plano": "プラン管理", "Dados preservados": "データを保持", "Em breve": "近日公開", "Escolha o nivel certo para sua rotina": "生活に合うプランを選択", "Estrutura inicial": "基本機能", "Gratis": "無料", "Indicacoes": "紹介", "Mais analise e automacao para a rotina individual.": "個人向けの分析と自動化を強化。", "Nivel ativo visivel no perfil.": "利用中のプランをプロフィールに表示。", "Organizacao financeira essencial para comecar.": "家計管理を始めるための基本機能。", "Os dados continuam seus em qualquer plano. Valores e cobranca serao definidos antes da liberacao comercial.": "どのプランでもデータの所有権はお客様にあります。料金は正式公開前に確定します。", "PLANOS NEKUMA": "NEKUMAプラン", "Plano atual": "現在のプラン", "RECOMENDADO": "おすすめ", "Recursos comerciais": "商用機能", "Registrar interesse": "利用希望を登録", "Trocar de plano nao apaga historico.": "プランを変更しても履歴は削除されません。", "para sempre": "無期限", "sem cobranca nesta etapa": "現在は請求なし",
    "ativos": "有効", "AGO": "8月", "Ainda nao ha historico mensal suficiente para detectar assinaturas, aumentos ou duplicidades.": "サブスクリプション、値上げ、重複を検出するための履歴がまだ不足しています。", "Aparece entre parenteses como comparativo. Nao pode ser igual a principal.": "比較値として括弧内に表示されます。基準通貨と同じ通貨は選べません。", "Categorias e recorrencias aprendidas com seus lancamentos.": "取引からカテゴリと定期支払いを学習します。", "Fallback": "予備値", "JUL": "7月", "JUN": "6月", "Local": "端末内", "MAI": "5月", "Navegador deste dispositivo": "この端末のブラウザ", "Nivel 1 · Organizador": "レベル1・家計整理", "OUT": "10月", "Opcao para solicitar exclusao definitiva do cadastro e dos dados associados.": "アカウントと関連データの完全削除を申請できます。", "Plano Free": "無料プラン", "Registre e categorize suas primeiras movimentacoes.": "最初の取引を登録して分類しましょう。", "Responsavel principal e pagador padrao para novas moradias.": "家族の管理者および新しい住居費の既定支払者。", "SET": "9月", "Suas conquistas aparecerao aqui.": "達成した実績がここに表示されます。", "Ultima Wise cadastrada - Sem cotacao online recente. Transferencias Wise continuam salvando a cotacao real usada.": "直近のWise登録・最新オンラインレートなし。Wise送金では実際に使用したレートを保存します。", "Usada nos saldos, graficos e relatorios.": "残高、グラフ、レポートで使用されます。", "Vencimentos, faturas, metas, shaken, seguros e pagamentos importantes.": "支払期限、請求、目標、車検、保険、重要な支払い。", "medalhas": "実績", "meses ativos": "利用月数", "pontos": "ポイント",
    "Como está o mercado hoje?": "今日の市場動向", "Tudo do Free": "無料プランの全機能", "Tudo do Plus": "Plusプランの全機能", "Leitura de recibos quando lancada": "公開後のレシート読取", "Familia - Membro": "家族・メンバー", "Pronto para conectar Supabase": "Supabase接続準備完了"
  });

  function fold(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  Object.assign(messages["en-US"], { "Proximo": "Next", "Concluir": "Finish", "Botao +": "+ button", "Scan": "Receipt scan" });
  Object.assign(messages["ja-JP"], { "Proximo": "次へ", "Concluir": "完了", "Botao +": "＋ボタン", "Scan": "レシート読取" });

  Object.assign(messages["en-US"], {
    "Entrar em uma familia": "Join a family", "Convite de um assinante Familia": "Invitation from a Family subscriber",
    "Conta bloqueada. Entre em contato com o suporte.": "Account blocked. Please contact support.",
    "Informe seu nome.": "Enter your name.",
    "Nao foi criado um novo cadastro. Tente entrar ou recuperar sua senha; se ainda nao confirmou seu email, confira sua caixa de entrada.": "No new account was created. Try signing in or resetting your password; if you have not verified your email, check your inbox.",
    "Salvar familia": "Save family", "Gerar ou copiar convite": "Generate or copy invitation",
    "Convites sao gerenciados pelo titular do plano Familia.": "Invitations are managed by the Family plan owner.",
    "Familia salva.": "Family saved.", "Dados sincronizados": "Synced data",
    "Apenas o titular do plano Familia pode gerar convites.": "Only the Family plan owner can generate invitations.",
    "Apenas o titular do plano Familia pode gerenciar a familia.": "Only the Family plan owner can manage the family.",
    "Recurso exclusivo do plano Familia.": "Available with the Family plan only.",
    "Seu plano Familia esta ativo": "Your Family plan is active", "Seu plano PRO esta ativo": "Your PRO plan is active",
    "Os recursos PRO e de conexao familiar foram liberados para sua conta.": "PRO features and family sharing are now available for your account.",
    "Os recursos PRO foram liberados para sua conta.": "PRO features are now available for your account."
  });
  Object.assign(messages["ja-JP"], {
    "Entrar em uma familia": "家族に参加", "Convite de um assinante Familia": "ファミリープラン契約者からの招待",
    "Conta bloqueada. Entre em contato com o suporte.": "アカウントが停止されています。サポートにお問い合わせください。",
    "Informe seu nome.": "お名前を入力してください。",
    "Nao foi criado um novo cadastro. Tente entrar ou recuperar sua senha; se ainda nao confirmou seu email, confira sua caixa de entrada.": "新しいアカウントは作成されませんでした。ログインまたはパスワードの再設定をお試しください。メール未確認の場合は受信箱をご確認ください。",
    "Salvar familia": "家族を保存", "Gerar ou copiar convite": "招待コードを発行・コピー",
    "Convites sao gerenciados pelo titular do plano Familia.": "招待はファミリープランの契約者が管理します。",
    "Familia salva.": "家族を保存しました。", "Dados sincronizados": "同期済みデータ",
    "Apenas o titular do plano Familia pode gerar convites.": "招待コードはファミリープランの契約者のみ発行できます。",
    "Apenas o titular do plano Familia pode gerenciar a familia.": "家族の管理はファミリープランの契約者のみ行えます。",
    "Recurso exclusivo do plano Familia.": "ファミリープラン限定の機能です。",
    "Seu plano Familia esta ativo": "ファミリープランが有効になりました", "Seu plano PRO esta ativo": "PROプランが有効になりました",
    "Os recursos PRO e de conexao familiar foram liberados para sua conta.": "PRO機能と家族共有をご利用いただけます。",
    "Os recursos PRO foram liberados para sua conta.": "PRO機能をご利用いただけます。"
  });

  Object.assign(messages["en-US"], {
    "Uma alteracao pendente exige outro plano. Seu acesso ao app continua liberado e os dados locais foram preservados.": "A pending change requires another plan. You can still access the app and your local data has been preserved.",
    "Disponivel no PRO e Familia. Seus dados existentes continuam salvos.": "Available with PRO and Family. Your existing data stays saved.",
    "Ver planos": "View plans", "Seu plano": "Your plan", "Recurso PRO": "PRO feature",
    "Graficos avancados": "Advanced charts", "Projecao salarial": "Salary forecast",
    "Nao foi possivel validar seu plano. Tente atualizar o app.": "Your plan could not be verified. Try refreshing the app.",
    "Limites ativos. Registros existentes sao preservados ao trocar de plano.": "Limits are active. Existing records are preserved when changing plans.",
    "Ativacao dos limites no servidor pendente.": "Server plan enforcement is pending activation."
  });
  Object.assign(messages["ja-JP"], {
    "Uma alteracao pendente exige outro plano. Seu acesso ao app continua liberado e os dados locais foram preservados.": "保留中の変更には別のプランが必要です。アプリは引き続き利用でき、端末のデータも保持されています。",
    "Disponivel no PRO e Familia. Seus dados existentes continuam salvos.": "PRO・ファミリープランで利用できます。既存のデータは保存されます。",
    "Ver planos": "プランを見る", "Seu plano": "ご利用プラン", "Recurso PRO": "PRO限定機能",
    "Graficos avancados": "詳細グラフ", "Projecao salarial": "給与予測",
    "Nao foi possivel validar seu plano. Tente atualizar o app.": "プランを確認できませんでした。アプリを再読み込みしてください。",
    "Limites ativos. Registros existentes sao preservados ao trocar de plano.": "プランの利用制限が有効です。プラン変更後も既存の記録は保持されます。",
    "Ativacao dos limites no servidor pendente.": "サーバー側の利用制限は有効化待ちです。"
  });

  const foldedMessages = Object.fromEntries(Object.entries(messages).map(([locale, dictionary]) => [
    locale,
    Object.fromEntries(Object.entries(dictionary).map(([source, translation]) => [fold(source), translation]))
  ]));

  const dynamicPatterns = {
    "en-US": [
      [/^Hoje · (.+)$/i, "Today · $1"],
      [/^menor saldo (.+)$/i, "lowest balance $1"],
      [/^(Janeiro|Fevereiro|Março|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) de (\d{4})$/i, (all, month, year) => ({ janeiro: "January", fevereiro: "February", marco: "March", abril: "April", maio: "May", junho: "June", julho: "July", agosto: "August", setembro: "September", outubro: "October", novembro: "November", dezembro: "December" })[fold(month)] + " " + year],
      [/^(\d+)% confirmado · (\d+)% estimado$/i, "$1% confirmed · $2% estimated"], [/^(\d+)% confirmado$/i, "$1% confirmed"],
      [/^(\d+)\/(\d+) ativos$/i, "$1/$2 active"], [/^(\d+) (categorias|operacoes|conciliados)$/i, (all, count, noun) => count + " " + t(noun, "en-US")],
      [/^Visao geral de (.+)$/i, "Overview for $1"], [/^(\d+) fonte(s?) no mes$/i, "$1 income source$2 this month"],
      [/^(\d+) meta\(s\) ativas?$/i, "$1 active goal(s)"], [/^(\d+) meses? ativos?$/i, "$1 active months"],
      [/^Outubro de (\d{4})$/i, "October $1"], [/^Setembro de (\d{4})$/i, "September $1"], [/^Novembro de (\d{4})$/i, "November $1"],
      [/^Criado por (.+)$/i, "Created by $1"], [/^Entrou em (.+)$/i, "Joined on $1"], [/^Pagamento: (.+)$/i, "Payment: $1"],
      [/^(\d+) ativas? no m[eê]s$/i, "$1 active this month"], [/^(.+)\s*\/\s*m[eê]s$/i, "$1 / month"],
      [/^(\d+) meses?$/i, "$1 months"],
      [/^(.+) - (Alta|Media|Baixa) prioridade$/i, "$1 - $2 priority"], [/^Alvo (.+) ate (.+)$/i, "Target $1 by $2"],
      [/^Alta prioridade - (\d+) meses? de seguranca - (.+)% da renda\.?$/i, "High priority - $1 months of security - $2% of income."],
      [/^(\d+) meses? de seguranca - (.+)% da renda\.?$/i, "$1 months of security - $2% of income."], [/^Reserva guardada: (.+)$/i, "Reserve saved: $1"],
      [/^Novo (.+)$/i, (all, item) => `New ${t(item, "en-US")}`], [/^Nova (.+)$/i, (all, item) => `New ${t(item, "en-US")}`],
      [/^Cadastrar (.+)$/i, (all, item) => `Add ${t(item, "en-US")}`], [/^Adicionar (.+)$/i, (all, item) => `Add ${t(item, "en-US")}`]
    ],
    "ja-JP": [
      [/^Hoje · (.+)$/i, "今日・$1"],
      [/^menor saldo (.+)$/i, "最低残高 $1"],
      [/^(Janeiro|Fevereiro|Março|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) de (\d{4})$/i, (all, month, year) => year + "年" + (({ janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 })[fold(month)]) + "月"],
      [/^(\d+)% confirmado · (\d+)% estimado$/i, "確定$1%・推定$2%"], [/^(\d+)% confirmado$/i, "確定$1%"],
      [/^(\d+)\/(\d+) ativos$/i, "$1/$2件有効"], [/^(\d+) (categorias|operacoes|conciliados)$/i, (all, count, noun) => t(noun, "ja-JP") + "：" + count + "件"],
      [/^Visao geral de (.+)$/i, "$1の家計概要"], [/^(\d+) fonte(s?) no mes$/i, "今月の収入源：$1件"],
      [/^(\d+) meta\(s\) ativas?$/i, "進行中の目標：$1件"], [/^(\d+) meses? ativos?$/i, "利用月数：$1か月"],
      [/^Outubro de (\d{4})$/i, "$1年10月"], [/^Setembro de (\d{4})$/i, "$1年9月"], [/^Novembro de (\d{4})$/i, "$1年11月"],
      [/^Criado por (.+)$/i, "作成者：$1"], [/^Entrou em (.+)$/i, "参加日：$1"], [/^Pagamento: (.+)$/i, "支払い：$1"],
      [/^(\d+) meses encontrados; valor medio (.+)\. Possivel recorrencia$/i, "$1か月検出・平均額 $2。定期支払いの可能性"],
      [/^Subiu (.+) desde a cobranca anterior\. Aumento$/i, "前回より$1上昇。値上げを検出"],
      [/^Mesmo valor registrado mais de uma vez no mesmo dia\. Possivel duplicada$/i, "同日に同額が複数回登録されています。重複の可能性"],
      [/^(\d+) ativas? no m[eê]s$/i, "今月は$1件"], [/^(.+)\s*\/\s*m[eê]s$/i, "$1／月"],
      [/^(\d+) meses?$/i, "$1か月"],
      [/^(.+) - Alta prioridade$/i, "$1・優先度：高"], [/^(.+) - Media prioridade$/i, "$1・優先度：中"], [/^(.+) - Baixa prioridade$/i, "$1・優先度：低"],
      [/^Alta prioridade - (\d+) meses? de seguranca - (.+)% da renda\.?$/i, "優先度：高・生活費$1か月分・収入の$2%。"],
      [/^Alvo (.+) ate (.+)$/i, "目標 $1・期限 $2"], [/^(\d+) meses? de seguranca - (.+)% da renda\.?$/i, "生活費$1か月分・収入の$2%。"],
      [/^Reserva guardada: (.+)$/i, "予備資金：$1"], [/^Gastos do mes e folego financeiro\.?$/i, "今月の支出と家計の残額。"],
      [/^Total previsto no mes$/i, "今月の予定合計"], [/^Nenhum (.+) cadastrad[oa]\.?$/i, (all, item) => `${t(item, "ja-JP")}は登録されていません。`],
      [/^Nenhuma (.+) cadastrada\.?$/i, (all, item) => `${t(item, "ja-JP")}は登録されていません。`],
      [/^Novo (.+)$/i, (all, item) => `${t(item, "ja-JP")}を追加`], [/^Nova (.+)$/i, (all, item) => `${t(item, "ja-JP")}を追加`],
      [/^Cadastrar (.+)$/i, (all, item) => `${t(item, "ja-JP")}を登録`], [/^Adicionar (.+)$/i, (all, item) => `${t(item, "ja-JP")}を追加`]
    ]
  };

  function normalize(value) {
    const locale = String(value || "").toLowerCase();
    if (locale.startsWith("ja")) return "ja-JP";
    if (locale.startsWith("en")) return "en-US";
    return "pt-BR";
  }

  function publicLanguage() {
    try { return normalize(localStorage.getItem(PUBLIC_LANGUAGE_KEY) || navigator.language); }
    catch (error) { return normalize(navigator.language); }
  }

  function publicUrl(path) {
    const productionHosts = ["nekumafinance.app", "app.nekumafinance.app", "nekuma-finance.pages.dev"];
    if (!productionHosts.includes(window.location.hostname)) return path;
    const url = new URL(path, window.location.href);
    if (!productionHosts.includes(url.hostname)) return path;
    if (/^\/app(?:\.html)?$/.test(url.pathname)) {
      url.hostname = "app.nekumafinance.app";
      url.pathname = "/app";
    } else if (/^\/(?:index\.html)?$/.test(url.pathname)) {
      url.hostname = "nekumafinance.app";
      url.pathname = "/";
      url.searchParams.delete("home");
    } else if (/^\/(?:privacy|terms)(?:\.html)?$/.test(url.pathname)) {
      url.hostname = "nekumafinance.app";
    } else return path;
    url.protocol = "https:";
    url.port = "";
    url.searchParams.set("lang", publicLanguage());
    return url.href;
  }

  function setPublicLanguage(locale) {
    const normalized = normalize(locale);
    try { localStorage.setItem(PUBLIC_LANGUAGE_KEY, normalized); } catch (error) {}
    document.documentElement.lang = normalized;
    return normalized;
  }

  function t(source, locale) {
    const normalized = normalize(locale || publicLanguage());
    const quoted = String(source || "").match(/^["“](.+)["”]$/);
    if (quoted) {
      const translatedInner = t(quoted[1], normalized);
      if (translatedInner !== quoted[1]) return normalized === "ja-JP" ? `「${translatedInner}」` : `"${translatedInner}"`;
    }
    const exact = messages[normalized]?.[source] || foldedMessages[normalized]?.[fold(source)];
    if (exact) return exact;
    for (const [pattern, replacement] of dynamicPatterns[normalized] || []) {
      if (pattern.test(source)) return source.replace(pattern, replacement);
    }
    return source;
  }

  function translate(root, locale) {
    if (!root) return;
    const normalized = normalize(locale || publicLanguage());
    root.querySelectorAll?.("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || /^(?:mailto:|tel:)/i.test(href)) return;
      link.setAttribute("href", publicUrl(href));
    });
    document.documentElement.lang = normalized;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(node.parentElement?.tagName)) return;
      const raw = node.nodeValue || "";
      const trimmed = raw.trim();
      if (!trimmed) return;
      const translated = t(trimmed, normalized);
      if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
    });
    root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach((element) => {
      ["placeholder", "title", "aria-label"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, t(value, normalized));
      });
    });
  }

  function languageSelector(className = "language-selector") {
    const locale = publicLanguage();
    return `<label class="${className}"><span class="sr-only">Language</span><i data-lucide="languages" aria-hidden="true"></i><select data-public-language aria-label="Language">${SUPPORTED.map((item) => `<option value="${item}" ${item === locale ? "selected" : ""}>${labels[item]}</option>`).join("")}</select></label>`;
  }

  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED.includes(requestedLanguage)) setPublicLanguage(requestedLanguage);

  window.NekumaI18n = { PUBLIC_LANGUAGE_KEY, SUPPORTED, labels, normalize, publicLanguage, setPublicLanguage, publicUrl, t, translate, languageSelector };
})();
