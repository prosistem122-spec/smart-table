import { STEP_IDS, type StepId } from "@/types";

export type StepType =
  | "hero"
  | "input"
  | "chips"
  | "choice"
  | "contact"
  | "quiz"
  | "calc"
  | "result"
  | "thanks";

export interface FunnelStep {
  id: StepId;
  type: StepType;
  video?: boolean;
  img?: boolean;
  recap?: boolean;
  kicker?: string;
  title?: string;
  label?: string;
  sub?: string;
  cta?: string;
  key?: string;
  itype?: string;
  ph?: string;
  icons?: string[];
  options?: string[];
  featuredOption?: string;
  reveal?: string;
  proof?: string[];
  final?: boolean;
  pillars?: { i: string; t: string }[];
}

export const STAGE_GROUPS = [
  { icon: "📋", from: 0, upTo: 5 },
  { icon: "💰", from: 6, upTo: 11 },
  { icon: "💡", from: 12, upTo: 16 },
  { icon: "🎁", from: 17, upTo: 19 },
] as const;

export interface ContactField {
  key: string;
  label: string;
  ph: string;
  itype: "text" | "tel" | "email";
  optional?: boolean;
}

export const CONTACT_FIELDS: ContactField[] = [
  { key: "resp_nome", label: "O teu nome", ph: "Nome completo", itype: "text" },
  { key: "whatsapp", label: "WhatsApp", ph: "+258 ...", itype: "tel" },
  {
    key: "cargo",
    label: "O teu cargo",
    ph: "Ex: Proprietário, Gerente",
    itype: "text",
    optional: true,
  },
  {
    key: "telefone",
    label: "Telefone para chamadas",
    ph: "Se for diferente do WhatsApp",
    itype: "tel",
    optional: true,
  },
  {
    key: "email",
    label: "Email",
    ph: "email@exemplo.com",
    itype: "email",
    optional: true,
  },
  {
    key: "contactoEmpresa",
    label: "Contacto do restaurante",
    ph: "Telefone ou email do restaurante",
    itype: "text",
    optional: true,
  },
];

export const STEPS: FunnelStep[] = [
  {
    id: STEP_IDS[0],
    type: "hero",
    video: true,
    title:
      "Veja como a <mark>inteligência artificial</mark> pode elevar o <mark>faturamento do teu restaurante</mark>",
    cta: "Quero a ferramenta",
  },
  {
    id: STEP_IDS[1],
    type: "hero",
    kicker: "Como funciona",
    title: "Antes de avançar, vamos analisar o teu negócio",
    img: true,
    sub: "Para perceber como aplicar a solução da forma mais eficaz para o teu restaurante.",
    cta: "Iniciar análise",
  },
  {
    id: STEP_IDS[2],
    type: "input",
    itype: "text",
    key: "nome",
    kicker: "Sobre o restaurante · 1 de 3",
    label: "Qual é o nome do teu restaurante?",
    ph: "Ex: Sabores da Baixa",
  },
  {
    id: STEP_IDS[3],
    type: "chips",
    key: "tipo",
    kicker: "Sobre o restaurante · 2 de 3",
    label: "Que tipo de restaurante é {nome}?",
    icons: ["🍽️", "🍔", "☕", "🍷", "🏷️"],
    options: [
      "Casual / à la carte",
      "Fast food",
      "Café ou pastelaria",
      "Fine dining",
      "Outro",
    ],
  },
  {
    id: STEP_IDS[4],
    type: "input",
    itype: "text",
    key: "local",
    kicker: "Sobre o restaurante · 3 de 3",
    label: "Onde fica localizado?",
    ph: "Cidade ou bairro",
  },
  {
    id: STEP_IDS[5],
    type: "contact",
    kicker: "Vamos manter contacto",
    title: "Para onde enviamos a tua análise de {nome}?",
    sub: "Precisamos destes contactos para falar diretamente contigo.",
    proof: ["🔒 Sem spam", "⏱ 20 segundos"],
    final: false,
    cta: "Continuar",
  },
  {
    id: STEP_IDS[6],
    type: "choice",
    key: "faturacao",
    kicker: "Sobre o faturamento · 1 de 2",
    label: "Qual é a faturação mensal aproximada de {nome}?",
    icons: ["🌱", "📈", "📊", "💼", "🏆"],
    options: [
      "Menos de 100.000 MZN",
      "100.000 – 300.000 MZN",
      "300.000 – 600.000 MZN",
      "600.000 – 1.000.000 MZN",
      "Mais de 1.000.000 MZN",
    ],
  },
  {
    id: STEP_IDS[7],
    type: "chips",
    key: "mesas",
    kicker: "Sobre o faturamento · 2 de 2",
    label: "Quantas mesas {nome} tem disponíveis para atendimento?",
    icons: ["🪑", "🍽️", "🏠", "🏢"],
    options: ["1–5 mesas", "5–10 mesas", "10–25 mesas", "Mais de 30 mesas"],
  },
  {
    id: STEP_IDS[8],
    type: "hero",
    kicker: "Quase lá",
    title: "Já conhecemos melhor {nome}",
    recap: true,
    sub: "Agora vamos descobrir o que pode realmente impulsionar o teu faturamento.",
    cta: "Continuar",
  },
  {
    id: STEP_IDS[9],
    type: "choice",
    key: "estado",
    kicker: "O que procuras · 1 de 3",
    label: "Como consideras o faturamento atual de {nome}?",
    icons: ["📈", "🔁", "🆘"],
    options: [
      "Estável, só desejo aumentar",
      "Oscila, às vezes é negativo",
      "Mau, estou quase a fechar",
    ],
  },
  {
    id: STEP_IDS[10],
    type: "chips",
    key: "solucao",
    kicker: "O que procuras · 2 de 3",
    label: "Quando pensas em aumentar o faturamento, que solução escolherias?",
    icons: ["👥", "💳", "🪑", "🤷"],
    options: [
      "Trazer mais clientes",
      "Aumentar o ticket médio",
      "Aumentar o número de mesas",
      "Não tenho uma estratégia eficaz",
    ],
  },
  {
    id: STEP_IDS[11],
    type: "choice",
    key: "aceita",
    kicker: "O que procuras · 3 de 3",
    featuredOption: "Sim, aceitaria",
    icons: ["✅", "🤔"],
    label:
      "E se te oferecêssemos uma ferramenta gratuita, capaz de aumentar o faturamento sem gastares em marketing nem correres risco de prejuízo — aceitarias?",
    options: ["Sim, aceitaria", "Depende da ferramenta"],
  },
  {
    id: STEP_IDS[12],
    type: "quiz",
    kicker: "Antes de revelarmos a solução · 1 de 3",
    title: 'Sabes o que é o "ticket médio" e porque ele pode mudar tudo?',
    featuredOption: "Nunca ouvi falar",
    icons: ["🧠", "🤔", "❓"],
    options: ["Sei bem o que é", "Já ouvi, mas não domino", "Nunca ouvi falar"],
    reveal:
      "O ticket médio é o valor médio que cada cliente gasta por visita. Aumentar esse valor em apenas 10–15% — sem precisares de mais clientes nem mais mesas — pode representar milhares de MZN a mais por mês para {nome}.",
  },
  {
    id: STEP_IDS[13],
    type: "calc",
    kicker: "Antes de revelarmos a solução · 2 de 3",
    title: "Vê como um pequeno aumento no ticket médio muda tudo",
    sub: "Ticket médio é quanto, em média, cada cliente gasta por visita. Multiplicado pelo número de clientes, isso define o teu faturamento. Experimenta aumentar o ticket médio abaixo:",
    cta: "Continuar",
  },
  {
    id: STEP_IDS[14],
    type: "quiz",
    kicker: "Antes de revelarmos a solução · 3 de 3",
    title: "Já pensaste em como a Inteligência Artificial pode trabalhar por ti?",
    featuredOption: "Nunca pensei nisso",
    icons: ["✅", "🤷", "💭"],
    options: ["Sim, interessa-me", "Tenho dúvidas", "Nunca pensei nisso"],
    reveal:
      "A Smart Table usa Inteligência Artificial para sugerir automaticamente, a cada cliente, os pratos e combinações certas — aumentando o ticket médio sem esforço extra da tua equipa. E vais poder experimentar esta tecnologia em {nome}, sem qualquer custo.",
  },
  {
    id: STEP_IDS[15],
    type: "hero",
    kicker: "Smart Table",
    title: "Esta é <mark>a nova era dos restaurantes</mark>",
    pillars: [
      { i: "🤖", t: "IA aplicada ao menu" },
      { i: "📊", t: "Decisões em tempo real" },
      { i: "💳", t: "Mais valor por cliente" },
    ],
    sub: "Restaurantes que usam Inteligência Artificial já vendem mais, com menos esforço. A Smart Table é a tecnologia por trás dessa mudança — e está prestes a chegar a {nome}.",
    cta: "Sim, quero fazer parte",
  },
  {
    id: STEP_IDS[16],
    type: "result",
    title: "Análise concluída",
    sub: "Com base nas tuas respostas, encontrámos a solução ideal para {nome} elevar o faturamento.",
    cta: "Obter a solução",
  },
  {
    id: STEP_IDS[17],
    type: "hero",
    video: true,
    title:
      "Esta tecnologia já está a <mark>elevar o faturamento</mark> de vários restaurantes",
    cta: "Obter a Smart Table",
  },
  {
    id: STEP_IDS[18],
    type: "contact",
    kicker: "Último passo",
    title: "Está na hora de impulsionar os resultados de {nome}",
    sub: "Confirma os teus dados para receberes a solução, sem qualquer custo adicional. Só o contacto do restaurante é opcional.",
    final: true,
    cta: "Quero receber a solução",
  },
  {
    id: STEP_IDS[19],
    type: "thanks",
    title: "Os teus dados foram entregues",
    sub: "A nossa equipa vai entrar em contacto em breve pelo WhatsApp para te entregar a solução de {nome}.",
  },
];

export function coversForMesas(m?: string): number {
  if (!m) return 60;
  if (m.indexOf("1–5") === 0) return 40;
  if (m.indexOf("5–10") === 0) return 80;
  if (m.indexOf("10–25") === 0) return 150;
  return 280;
}

export const CALC_BASE = 450;

export function fmtN(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
