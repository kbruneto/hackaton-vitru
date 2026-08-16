import { useCallback, useEffect, useRef, useState } from "react";
import logoAsset from "./assets/vitru.png";
import yellowStar from "./assets/estrela_amarela.png";
import whiteStar from "./assets/estrela_opacidade.png";
import modelAsset from "./assets/modelo.png";
import { useRanking } from "./useRanking";
import {
  ArrowDownToLine,
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  Download,
  FileText,
  Filter,
  House,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";

const navigation = [
  { id: "home", label: "Página Inicial", icon: House },
  { id: "activities", label: "Atividades", icon: Pencil },
  { id: "works", label: "Trabalhos", icon: FileText },
  { id: "tests", label: "Provas", icon: CalendarDays },
  { id: "ranking", label: "Ranking de Classificação", icon: Crown },
];

const activities = [
  {
    id: "review-2",
    name: "Atividade Revisão 2",
    due: "17/08",
    status: "Urgente - 1 dia",
    statusType: "urgent",
  },
  {
    id: "review-1",
    name: "Atividade Revisão 1",
    due: "14/08",
    status: "Em correção",
    statusType: "review",
  },
  {
    id: "group",
    name: "Atividade em Grupo",
    due: "10/08",
    status: "Corrigido",
    statusType: "done",
    grade: "9,25",
  },
];

const initialNotifications = [
  {
    id: "notification-1",
    createdAt: "2026-08-12T09:30:00",
    title: "Nova atividade disponível",
    date: "12/08, às 09:30",
    body: "Uma nova atividade foi disponibilizada no seu portal.",
    actionLabel: "Ver atividades",
    action: "activities",
  },
  {
    id: "notification-2",
    createdAt: "2026-08-10T16:45:00",
    title: "Correção realizada",
    date: "10/08, às 16:45",
    body: "A Atividade em Grupo foi corrigida. Acesse a área de atividades para consultar sua nota.",
    actionLabel: "Ver correção",
    action: "submitted-detail",
  },
  {
    id: "notification-3",
    createdAt: "2026-08-16T09:30:00",
    title: "Atenção ao prazo da atividade",
    date: "Hoje, às 09:30",
    body: "A Atividade Revisão 2 está próxima do prazo final. Envie seu arquivo para não perder a oportunidade de concluir a atividade.",
    actionLabel: "Enviar atividade",
    action: "activity-detail",
  },
];

const postSubmissionNotifications = [
  {
    id: "notification-correction",
    createdAt: "2026-08-16T09:40:00",
    title: "Atividade corrigida",
    date: "Agora",
    body: "A Atividade Revisão 2 foi corrigida. Consulte os detalhes e acompanhe o resultado da sua entrega.",
    actionLabel: "Ver correção",
    action: "submitted-detail",
  },
  {
    id: "notification-ranking",
    createdAt: "2026-08-16T09:41:00",
    title: "Alto desempenho detectado, seu esforço virou dinheiro!",
    date: "Agora",
    body: "Nossa inteligência artificial analisou suas entregas nesse mês e você desbloqueou uma nova recompensa aqui na Vitru. Você acaba de garantir a faixa de 15% de desconto na próxima mensalidade pelo seu excelente desempenho. Acesse o menu Ranking de Classificação para conferir o seu extrato de benefícios e ver sua posição no polo!",
    actionLabel: "Ver ranking",
    action: "ranking",
  },
];

function Sidebar({ page, onNavigate, onNotifications, unreadCount }) {
  return (
    <aside className="w-full shrink-0 lg:w-[300px]">
      <div className="flex items-center justify-between">
        <img
          className="h-12 w-[102px] object-contain"
          src={logoAsset}
          alt="Vitru"
        />
        <div className="flex items-center gap-4 text-[#262626]">
          <button
            className="relative"
            type="button"
            aria-label="Notificações"
            onClick={onNotifications}
          >
            <Bell size={22} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c43227] text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button type="button" aria-label="Perfil">
            <UserRound size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex h-10 items-center justify-between rounded bg-[#f1f1f1] px-4 text-[#676767]">
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#676767]"
            placeholder="Pesquisar..."
            aria-label="Pesquisar"
          />
          <Search size={17} strokeWidth={1.5} />
        </div>
        <nav className="mt-6 flex flex-col gap-2" aria-label="Menu principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`flex h-12 w-full items-center gap-2 rounded-[10px] px-4 text-left text-base transition ${page === id ? "bg-white text-[#262626] shadow-sm" : "text-[#787878] hover:bg-white/70"}`}
              key={id}
              type="button"
              onClick={() =>
                (id === "home" || id === "activities" || id === "ranking") &&
                onNavigate(id)
              }
            >
              <Icon size={17} strokeWidth={1.5} />
              <span className="flex-1 truncate">{label}</span>
              {id !== "home" && <ChevronRight size={16} strokeWidth={1.5} />}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function Home({ onRanking }) {
  return (
    <section className="min-w-0 flex-1">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[2.8px] text-[#676767]">
          Página inicial
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-[-0.96px]">
          Olá, Júlio!
        </h1>
        <p className="mt-1 text-base text-[#676767]">
          Seja bem vindo ao Portal da Vitru
        </p>
      </header>
      {/* Temporarily hidden while the home layout is being finalized.
      <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#7330b5] px-6 py-4 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 text-base">
          <span className="relative shrink-0">
            <Bell size={30} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c43227] px-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </span>
          <span>
            {unreadCount > 0
              ? "Você tem novas mensagens na "
              : "Confira a sua "}
            <strong>Central de Notificações</strong>!
          </span>
        </div>
        <button
          className="h-10 shrink-0 rounded-full bg-[#f5b731] px-3 text-sm text-white"
          type="button"
          onClick={onNotifications}
        >
          Ir para a central
        </button>
      </div> */}
      <div className="mt-8 space-y-8">
        <article className="relative flex h-fit gap-2 overflow-hidden rounded-[24px] bg-[#7330b5] p-8 text-white">
          <img className="pointer-events-none absolute -right-24 -top-32 z-0 h-[430px] w-[430px] object-contain" src={yellowStar} alt="" />
          <img className="pointer-events-none absolute left-[-5%] top-[8%] z-0 h-[520px] w-[520px] object-contain" src={whiteStar} alt="" />
          <img className="pointer-events-none absolute -bottom-32 right-0 z-10 h-[520px] w-[430px] max-w-[48%] object-cover object-left-top" src={modelAsset} alt="Estudante comemorando seu desempenho" />
          <div className="relative z-20 max-w-[520px]">
            <h2 className="max-w-[460px] text-[40px] font-normal leading-[1.05] tracking-[-1px]">Na Vitru,<br /><strong>seu estudo<br />vira <span className="text-[#f5b731]">dinheiro</span>!</strong></h2>
            <p className="mt-8 max-w-[500px] text-base leading-6 text-white">Suas consistência e desempenho geram saldo todo mês. Escolha:</p>
            <ul className="mt-5 list-disc space-y-1 pl-6 text-base leading-6 text-white"><li>Ganhe descontos na <strong>mensalidade atual</strong></li><li>Multiplique o benefício em <strong>novos cursos</strong></li></ul>
            <div className="mt-8 flex max-w-[385px] flex-col gap-2"><button className="h-10 rounded-full bg-[#f5b731] px-4 text-sm font-bold text-white transition hover:brightness-110" type="button" onClick={onRanking}>Conferir benefícios</button></div>
          </div>
        </article>
        <div className="grid gap-8 md:grid-cols-2">
          <article className="relative flex min-h-[332px] flex-col overflow-hidden rounded-[24px] bg-[#f5b731] p-6 text-white">
            <img className="pointer-events-none absolute -right-20 -top-12 h-[360px] w-[360px] object-contain" src={whiteStar} alt="" />
            <div className="relative z-10"><p className="text-base"><strong>Score </strong><span>atual:</span></p><p className="mt-2 text-[96px] font-extrabold leading-none sm:text-[128px]">93</p><div className="mt-10"><p className="text-base font-semibold leading-tight">Última atualização:</p><p>15/08 as 20h30</p></div></div><button className="relative z-10 mt-4 h-10 w-fit rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white" type="button" onClick={onRanking}>Ir para o Ranking</button>
          </article>
          <article className="relative flex min-h-[332px] flex-col overflow-hidden rounded-[24px] bg-white p-6 text-[#471d6e]">
            <img className="pointer-events-none absolute -right-32 -top-12 h-[360px] w-[360px] object-contain" src={yellowStar} alt="" />
            <div className="relative z-10"><p className="text-base"><strong>Tarefas </strong><span>do mês:</span></p><p className="mt-2 flex items-end gap-2 text-[96px] font-extrabold leading-none text-[#7330b5] sm:text-[128px]">85<span className="text-[54px] sm:text-[64px]">%</span></p><div className="mt-4 w-40"><div className="h-2.5 overflow-hidden rounded-full bg-[#E4D4F3]"><div className="h-full w-[136px] rounded-full bg-[#7330B5]" /></div></div><div className="mt-4 text-sm text-[#676767]"><p className="font-semibold">Última atualização:</p><p>15/08 as 20h30</p></div></div><button className="relative z-10 mt-4 h-10 w-fit rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white" type="button" onClick={onRanking}>Ir para o Ranking</button>
          </article>
        </div>
      </div>
    </section>
  );
}

function PageHeading({ children, onBack }) {
  return (
    <header>
      <p className="text-sm font-semibold uppercase tracking-[2.8px] text-[#676767]">
        Atividades
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-[32px] font-extrabold leading-tight tracking-[-0.96px]">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={24} strokeWidth={1.5} />
          </button>
        )}
        {children}
      </h1>
    </header>
  );
}

function ActivitiesList({ onOpen }) {
  return (
    <section className="min-w-0 flex-1">
      <PageHeading>Confira suas atividades</PageHeading>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-white px-4 text-sm text-[#676767]">
          <Search size={16} />
          <input
            className="w-full bg-transparent outline-none"
            placeholder="Buscar por nome..."
            aria-label="Buscar por nome"
          />
          <button
            className="-mr-4 h-10 w-20 rounded-full bg-[#7330b5] text-xs text-white"
            type="button"
          >
            Buscar
          </button>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e0e0e0] px-4 text-sm"
          type="button"
        >
          <Filter size={15} strokeWidth={1.5} />
          Filtros
        </button>
        <button
          className="h-10 rounded-full border border-[#e0e0e0] px-4 text-sm"
          type="button"
        >
          <ArrowDownToLine size={15} className="mr-2 inline" />
          Exportar tabela
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg bg-white">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-[#f1f1f1] text-xs text-[#676767]">
            <tr>
              <th className="px-3 py-3 font-medium">Nome da atividade</th>
              <th className="px-3 py-3 font-medium">Disciplina</th>
              <th className="px-3 py-3 font-medium">Data de entrega</th>
              <th className="px-3 py-3 font-medium">Nota</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr
                className="border-b border-[#e0e0e0] last:border-0"
                key={activity.id}
              >
                <td className="px-3 py-4">
                  <button
                    className="text-[#6d42c4] underline"
                    type="button"
                    onClick={() => onOpen(activity.id)}
                  >
                    {activity.name}
                  </button>
                </td>
                <td className="px-3 py-4">Cálculo 1</td>
                <td className="px-3 py-4">{activity.due}</td>
                <td className="px-3 py-4">{activity.grade || "-"}</td>
                <td className="px-3 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${activity.statusType === "urgent" ? "bg-[#ef4444] text-white" : "bg-[#f1f1f1] text-[#262626]"}`}
                  >
                    {activity.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 text-xs text-[#676767]">
        <span>Página 1 de 10</span>
        <div className="flex items-center gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0] transition hover:border-[#7330b5] hover:text-[#7330b5]"
            type="button"
            aria-label="Primeira página"
          >
            «
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0] transition hover:border-[#7330b5] hover:text-[#7330b5]"
            type="button"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#7330b5] bg-[#7330b5] font-semibold text-white"
            type="button"
            aria-current="page"
          >
            1
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0] transition hover:border-[#7330b5] hover:text-[#7330b5]"
            type="button"
            aria-label="Próxima página"
          >
            ›
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0] transition hover:border-[#7330b5] hover:text-[#7330b5]"
            type="button"
            aria-label="Última página"
          >
            »
          </button>
        </div>
      </div>
    </section>
  );
}

function FileRow({ label, meta, action, destructive, onAction }) {
  return (
    <div className="flex h-[52px] items-center gap-3 rounded-lg bg-white px-4">
      <FileText size={18} strokeWidth={1.5} />
      <strong className="text-sm">{label}</strong>
      <span className="text-xs text-[#787878]">{meta}</span>
      {action && (
        <button
          className={`ml-auto ${destructive ? "text-[#ef4444]" : "text-[#262626]"}`}
          type="button"
          onClick={onAction}
          aria-label={destructive ? "Apagar arquivo" : "Baixar arquivo"}
        >
          {destructive ? <Trash2 size={18} /> : <Download size={18} />}
        </button>
      )}
    </div>
  );
}

function ActivityDetail({ submitted, onBack, onSubmitted }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  useEffect(() => {
    if (isSubmitted) onSubmitted();
  }, [isSubmitted, onSubmitted]);
  const selectedFile =
    file || (isSubmitted ? { name: "nome do arquivo.pdf", size: "5MB" } : null);
  const attachFile = (event) => {
    const nextFile = event.target.files?.[0];
    if (nextFile)
      setFile({
        name: nextFile.name,
        size: `${Math.max(1, Math.round(nextFile.size / 1024))}KB`,
      });
  };
  const downloadPrompt = () => {
    const blob = new Blob(["Enunciado da Atividade Revisão 2"], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enunciado-atividade-revisao-2.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-w-0 flex-1">
      <PageHeading onBack={onBack}>Atividade Revisão 2</PageHeading>
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Informações</h2>
          <ChevronDown size={20} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5 border-b border-[#e0e0e0] pb-7 text-sm sm:grid-cols-4">
          <div>
            <strong className="block text-xs">Disciplina</strong>
            <span className="mt-2 block text-[#787878]">Cálculo</span>
          </div>
          <div>
            <strong className="block text-xs">Data de entrega</strong>
            <span className="mt-2 block text-[#787878]">17/09</span>
          </div>
          <div>
            <strong className="block text-xs">Nota</strong>
            <span className="mt-2 block text-[#787878]">-</span>
          </div>
          <div>
            <strong className="block text-xs">Status</strong>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${isSubmitted ? "bg-[#f1f1f1] text-[#262626]" : "bg-[#ef4444] text-white"}`}
            >
              {isSubmitted ? "Em correção" : "Urgente - 1 dia"}
            </span>
          </div>
        </div>
      </section>
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Envio da atividade</h2>
          <ChevronDown size={20} />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold">
            Enunciado da atividade <span className="text-[#ef4444]">*</span>
          </p>
          <FileRow
            label="Enunciado"
            meta="nome do arquivo.pdf - 5MB"
            action
            onAction={downloadPrompt}
          />
          <p className="mb-2 mt-5 text-xs font-semibold">
            Entrega da atividade <span className="text-[#ef4444]">*</span>
          </p>
          {selectedFile ? (
            <FileRow
              label={isSubmitted ? "Entrega da atividade" : selectedFile.name}
              meta={`${selectedFile.name} - ${selectedFile.size}`}
              action={isSubmitted}
              destructive={isSubmitted}
              onAction={() => {
                setFile(null);
                setIsSubmitted(false);
              }}
            />
          ) : (
            <>
              <button
                className="flex items-center gap-2 text-sm font-semibold text-[#7330b5]"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0]">
                  <Upload size={15} />
                </span>
                Anexar arquivo
              </button>
              <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept=".pdf"
                onChange={attachFile}
              />
              <p className="ml-10 text-xs text-[#787878]">
                Extensões permitidas: PDF　|　Tamanho Máximo: 100MB
              </p>
            </>
          )}
          {selectedFile && !isSubmitted && (
            <div className="mt-3 flex gap-3">
              <button
                className="h-10 rounded-full bg-[#7330b5] px-4 text-sm text-white"
                type="button"
                onClick={() => setIsSubmitted(true)}
              >
                Submeter atividade
              </button>
              <button
                className="h-10 rounded-full border border-[#e0e0e0] px-4 text-sm text-[#7330b5]"
                type="button"
                onClick={() => setFile(null)}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function NotificationAvatar({ isNew }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7330b5]">
      <img className="h-7 w-7 object-contain" src={yellowStar} alt="" />
      {isNew && (
        <span className="absolute -right-2 -top-2 rounded-full bg-[#c43227] px-2 py-1 text-[10px] font-semibold leading-none text-white">
          Nova
        </span>
      )}
    </span>
  );
}

function NotificationsPage({ items, readIds, openIds, onToggle, onAction }) {
  return (
    <section className="min-w-0 flex-1">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[2.8px] text-[#676767]">
          Central
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-[-0.96px]">
          Notificações
        </h1>
        <p className="mt-1 text-base text-[#676767]">
          Acompanhe as novidades do seu portal.
        </p>
      </header>
      <div className="mt-10 max-w-[760px] space-y-3">
        {items
          .slice()
          .sort((first, second) =>
            second.createdAt.localeCompare(first.createdAt),
          )
          .map((notification) => {
            const isRead = readIds.includes(notification.id);
            const isOpen = openIds.includes(notification.id);
            return (
              <article
                className={`overflow-hidden rounded-xl bg-white transition ${!isRead ? "shadow-sm" : ""}`}
                key={notification.id}
              >
                <button
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                  type="button"
                  onClick={() => onToggle(notification.id)}
                >
                  <NotificationAvatar isNew={!isRead} />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base">
                      {notification.title}
                    </strong>
                    <span className="mt-1 block text-xs text-[#787878]">
                      {notification.date}
                    </span>
                  </span>
                  <ChevronDown
                    className={`shrink-0 text-[#676767] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    size={18}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#f1f1f1] px-5 pb-5 pt-4 pl-[76px] text-sm leading-6 text-[#676767]">
                    <p>{notification.body}</p>
                    <button
                      className="mt-4 h-9 rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white transition hover:brightness-110"
                      type="button"
                      onClick={() => onAction(notification.action)}
                    >
                      {notification.actionLabel}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}

function RankingPage() {
  const { status, dados, erro, recarregar } = useRanking();

  // O backend ja devolve ordenado por pontos (maior primeiro) e com posicao
  // calculada, entao aqui e so renderizar na ordem que chegou.
  const rankingRows = (dados?.ranking ?? []).map((aluno) => ({
    position: String(aluno.posicao).padStart(2, "0"),
    name: aluno.nome,
    score: `${aluno.score}/100`,
    region: aluno.uf ?? "--",
    unit: aluno.polo ?? "--",
    discount: `${aluno.descontoPercentual}% Off`,
    isVoce: dados?.me != null && aluno.id === dados.me.id,
  }));

  const me = dados?.me ?? null;

  return (
    <section className="min-w-0 flex-1">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[2.8px] text-[#676767]">
          Ranking de Classificação
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-[-0.96px]">Confira seu desempenho no ranking</h1>
        <p className="mt-1 text-base text-[#676767]">Acompanhe seu desempenho, resgate seus descontos e compartilhe seu desempenho</p>
      </header>
      <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-3">
        <article className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[24px] bg-[#7330b5] px-6 pb-6 pt-12 text-left text-white">
          <div className="pointer-events-none absolute -top-3 left-0 flex w-full justify-around" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => <span className="h-6 w-6 shrink-0 rounded-full bg-[#f8f8f8]" key={`top-${index}`} />)}
          </div>
          <div className="pointer-events-none absolute -bottom-3 left-0 flex w-full justify-around" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => <span className="h-6 w-6 shrink-0 rounded-full bg-[#f8f8f8]" key={`bottom-${index}`} />)}
          </div>
          <div className="relative z-10 flex h-full flex-col gap-4 text-left">
            <div>
              <p className="text-[96px] font-extrabold leading-none">5%</p>
              <p className="mt-2 text-base leading-5">de desconto para pagar<br />sua mensalidade</p>
            </div>
            <div className="flex items-center gap-3 text-xs"><span className="flex-1 border-t border-dotted border-white/60" /><span>ou</span><span className="flex-1 border-t border-dotted border-white/60" /></div>
            <div>
              <p className="text-[96px] font-extrabold leading-none">20%</p>
              <p className="mt-2 text-base leading-5">de desconto para comprar<br /><strong>produtos e cursos Vitru</strong></p>
            </div>
            <button className="mt-auto h-10 rounded-full bg-white px-4 text-sm font-medium text-[#7330b5]" type="button">Resgatar cupom único</button>
          </div>
        </article>
        <article className="relative flex h-full min-h-0 w-full min-w-0 flex-col justify-between overflow-hidden rounded-[24px] bg-[#f5b731] p-6 text-white">
          <img className="pointer-events-none absolute -right-20 -top-12 h-[360px] w-[360px] object-contain" src={whiteStar} alt="" />
          <div className="relative z-10">
            <p className="text-base"><strong>Score </strong><span>atual:</span></p>
            <p className="mt-2 text-[96px] font-extrabold leading-none">
              {me ? me.score : "--"}
            </p>
            <p className="mt-0 text-[48px] font-extrabold leading-none">/ 100</p>
          </div>
            <div className="relative z-10 mt-8 text-base">
            <p className="font-semibold leading-tight">Última atualização:</p>
            <p>
              {dados?.atualizadoEm
                ? new Date(dados.atualizadoEm).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--"}
            </p>
            <button className="mt-4 h-10 w-fit rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white" type="button">Ver Classificação</button>
          </div>
        </article>
        <article className="flex h-fit min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[24px] bg-white text-[#262626]">
          <div className="relative h-[152px] shrink-0 overflow-hidden bg-[#7330b5] p-4">
            <img className="pointer-events-none absolute -right-16 -top-14 h-[250px] w-[250px] object-contain" src={yellowStar} alt="" />
            <img className="relative z-10 h-6 w-auto brightness-0 invert" src={logoAsset} alt="Vitru" />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div>
              <h2 className="text-base font-bold leading-5">Retrospectiva Vitru</h2>
              <p className="text-two-lines mt-2 text-[10px] leading-3">Confira seus melhores momentos conosco!</p>
            </div>
            <div className="mt-2 h-0.5 w-full bg-[#f5b731]" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <h3 className="text-two-lines text-[10px] font-bold leading-3">Disciplinas<br />mais estudadas</h3>
                {['Cálculo Numérico', 'Geometria Analítica', 'Algoritmos e Estrutura de Dados', 'Ciência da Computação', 'História da Computação'].map((item, index) => <div className="flex items-start gap-2" key={item}><span className="w-3 shrink-0 text-right text-base font-bold leading-4 text-[#f5b731]">{index + 1}</span><span className="text-two-lines text-[10px] leading-3">{item}</span></div>)}
              </div>
              <div className="space-y-2">
                <h3 className="text-two-lines text-[10px] font-bold leading-3">Suas<br />melhores notas</h3>
                {['Prova 9,8 (Geometria A...)', 'Prova 9,8 (História da...)', 'Trabalho 8,8 (História da...)', 'Prova 8,5 (Geometria A...)', 'Atividade 8,5 (Geometria A...)'].map((item, index) => <div className="flex items-start gap-2" key={item}><span className="w-3 shrink-0 text-right text-base font-bold leading-4 text-[#f5b731]">{index + 1}</span><span className="text-two-lines text-[10px] leading-3">{item}</span></div>)}
              </div>
            </div>
            <button className="mt-4 h-10 rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white" type="button">Compartilhar resultados</button>
          </div>
        </article>
      </div>
      <div className="mt-8 overflow-x-auto rounded-lg bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f1f1f1] text-xs text-[#676767]">
            <tr>
              <th className="px-3 py-3 font-medium">Posição　↕</th>
              <th className="px-3 py-3 font-medium">Nome do estudante　↕</th>
              <th className="px-3 py-3 font-medium">Score　↕</th>
              <th className="px-3 py-3 font-medium">Região</th>
              <th className="px-3 py-3 font-medium">Unidade　↕</th>
              <th className="px-3 py-3 font-medium">Desconto　↕</th>
            </tr>
          </thead>
          <tbody>
            {status === "carregando" &&
              [0, 1, 2].map((linha) => (
                <tr className="border-b border-[#e0e0e0] last:border-0" key={`skeleton-${linha}`}>
                  <td className="px-3 py-4" colSpan={6}>
                    <span className="block h-5 animate-pulse rounded bg-[#f0f0f0]" />
                  </td>
                </tr>
              ))}

            {status === "erro" && (
              <tr>
                <td className="px-3 py-6" colSpan={6}>
                  <p className="text-sm font-semibold text-[#8a2a21]">
                    Não foi possível carregar o ranking.
                  </p>
                  <p className="mt-1 text-xs text-[#a04a41]">{erro}</p>
                  <button
                    className="mt-3 h-9 rounded-full bg-[#7330b5] px-4 text-sm font-medium text-white"
                    type="button"
                    onClick={recarregar}
                  >
                    Tentar novamente
                  </button>
                </td>
              </tr>
            )}

            {status === "ok" && rankingRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-sm text-[#676767]" colSpan={6}>
                  Nenhum estudante classificado neste ciclo ainda.
                </td>
              </tr>
            )}

            {status === "ok" &&
              rankingRows.map((row) => (
                <tr
                  className={`border-b border-[#e0e0e0] last:border-0 ${row.isVoce ? "bg-[#f3eafa] font-semibold text-[#471d6e]" : ""}`}
                  key={row.position}
                >
                  <td className="px-3 py-4">{row.position}</td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7330b5]">
                        <img className="h-5 w-5 object-contain" src={yellowStar} alt="" />
                      </span>
                      <span>
                        {row.name}
                        {row.isVoce && (
                          <span className="ml-2 text-xs text-[#7330b5]">Você</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4">{row.score}</td>
                  <td className="px-3 py-4">{row.region}</td>
                  <td className="px-3 py-4">{row.unit}</td>
                  <td className="px-3 py-4">
                    <span className="rounded-full bg-[#7330b5] px-2 py-1 text-xs text-white">{row.discount}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 text-xs text-[#7330b5]">
        <span>Página 1 de 10</span>
        <div className="flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0]" type="button" aria-label="Primeira página">«</button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0]" type="button" aria-label="Página anterior">‹</button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#7330b5] bg-[#7330b5] font-semibold text-white" type="button" aria-current="page">1</button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0]" type="button" aria-label="Próxima página">›</button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[#a0a0a0]" type="button" aria-label="Última página">»</button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [activityId, setActivityId] = useState(null);
  const [submittedActivities, setSubmittedActivities] = useState([]);
  const [, setSubmittedVersion] = useState(0);
  const [notificationItems, setNotificationItems] =
    useState(initialNotifications);
  const [readIds, setReadIds] = useState(["notification-1", "notification-2"]);
  const [openIds, setOpenIds] = useState([]);
  const unreadCount = notificationItems.filter(
    ({ id }) => !readIds.includes(id),
  ).length;
  const openActivity = (id) => {
    setActivityId(id);
    setPage("detail");
  };
  const openNotifications = () => setPage("notifications");
  const toggleNotification = (id) => {
    setReadIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setOpenIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  useEffect(() => {
    if (
      !submittedActivities.includes("review-2") ||
      notificationItems.some(({ id }) => id === "notification-correction")
    )
      return undefined;
    const timer = setTimeout(() => {
      setNotificationItems((current) => [
        ...current,
        ...postSubmissionNotifications,
      ]);
    }, 10000);
    return () => clearTimeout(timer);
  }, [submittedActivities, notificationItems]);
  const handleNotificationAction = (action) => {
    if (action === "activities") setPage("activities");
    if (action === "activity-detail" || action === "submitted-detail") {
      setActivityId("review-2");
      setPage("detail");
    }
    if (action === "ranking") setPage("ranking");
  };
  const markActivitySubmitted = useCallback(() => {
    const activity = activities.find(({ id }) => id === activityId);
    if (activity) {
      activity.status = "Em correção";
      activity.statusType = "review";
    }
    setSubmittedActivities((current) =>
      current.includes(activityId) ? current : [...current, activityId],
    );
    setSubmittedVersion((version) => version + 1);
  }, [activityId]);
  const renderPage =
    page === "home" ? (
      <Home onRanking={() => setPage("ranking")} />
    ) : page === "activities" ? (
      <ActivitiesList onOpen={openActivity} />
    ) : page === "notifications" ? (
      <NotificationsPage
        items={notificationItems}
        readIds={readIds}
        openIds={openIds}
        onToggle={toggleNotification}
        onAction={handleNotificationAction}
      />
    ) : page === "ranking" ? (
      <RankingPage />
    ) : (
      <ActivityDetail
        submitted={submittedActivities.includes(activityId)}
        onBack={() => setPage("activities")}
        onSubmitted={markActivitySubmitted}
      />
    );
  return (
    <main className="min-h-screen bg-[#f8f8f8] px-5 py-8 font-['Barlow',sans-serif] text-[#262626] sm:px-10 lg:px-[120px] lg:py-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 lg:flex-row lg:gap-12">
        <Sidebar
          page={page === "detail" ? "activities" : page}
          onNavigate={setPage}
          onNotifications={openNotifications}
          unreadCount={unreadCount}
        />
        {renderPage}
      </div>
    </main>
  );
}

export default App;
