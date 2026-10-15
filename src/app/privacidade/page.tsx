import Link from "next/link";

export const metadata = {
  title: "Política de privacidade — Smart Table",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "40px 20px 64px",
        fontFamily: "Segoe UI, system-ui, sans-serif",
        color: "#111116",
        lineHeight: 1.6,
      }}
    >
      <p style={{ color: "#2446EE", fontWeight: 700 }}>Smart Table</p>
      <h1 style={{ letterSpacing: "-0.02em" }}>Política de privacidade</h1>
      <p style={{ color: "#6B6F80" }}>
        Esta página explica que dados pessoais recolhemos na análise gratuita e
        como os utilizamos.
      </p>

      <h2>Que dados recolhemos</h2>
      <ul>
        <li>Nome do restaurante</li>
        <li>Número de telefone / WhatsApp</li>
        <li>Respostas que fores dando no funil (tipo de restaurante, mesas, etc.)</li>
        <li>
          Eventos de navegação no funil (etapas vistas, botões relevantes),
          apenas com o teu consentimento de analytics
        </li>
        <li>Parâmetros de campanha (UTM) e referrer, quando disponíveis</li>
      </ul>

      <h2>Finalidades</h2>
      <p>
        Utilizamos estes dados para personalizar a análise, contactar-te sobre a
        solução Smart Table (se autorizares) e compreender onde o funil pode
        ser melhorado. Não vendemos os teus dados.
      </p>

      <h2>O que não recolhemos</h2>
      <ul>
        <li>Palavras-passe ou dados de pagamento</li>
        <li>Impressões digitais do dispositivo (fingerprinting)</li>
        <li>Localização GPS precisa</li>
      </ul>

      <h2>Base e retenção</h2>
      <p>
        O tratamento baseia-se no teu consentimento e no interesse legítimo de
        responder a pedidos comerciais. Os dados são retidos pelo período
        configurado no sistema (por defeito até 365 dias), após o qual podem ser
        eliminados ou anonimizados.
      </p>

      <h2>Os teus direitos</h2>
      <p>
        Podes pedir acesso, correção ou eliminação dos teus dados contactando a
        equipa Smart Table. O acesso administrativo aos dados pessoais está
        limitado a utilizadores autorizados.
      </p>

      <p>
        <Link href="/" style={{ color: "#2446EE", fontWeight: 600 }}>
          ← Voltar à análise
        </Link>
      </p>
    </main>
  );
}
