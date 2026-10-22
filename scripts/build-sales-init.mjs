import fs from "fs";

const raw = fs.readFileSync(
  "c:/Users/Reginaldo Junior/Desktop/ssss/src/components/sales/sales-init.raw.js",
  "utf8"
);

// Convert standalone script into an exported init function with tracking hooks.
const wrapped = `/* Auto-generated from sales-init.raw.js — do not edit by hand */
export type SalesInitOptions = {
  whatsappNumber: string;
  onCtaClick?: (element: string) => void;
  onDemoStep?: (step: number) => void;
  onWhatsAppClick?: (element: string) => void;
  onFormRedirect?: () => void;
};

export function initSalesLanding(
  root: ParentNode = document,
  options: SalesInitOptions
): () => void {
  const WA = String(options.whatsappNumber || "258853003836").replace(/\\\\D/g, "");
  function wa(t: string) {
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(t);
  }

  const cleanups: Array<() => void> = [];

${raw
  .replace(/var WA="[^"]*";[^\n]*/g, "// WA from options")
  .replace(
    /function wa\\(t\\)\\{return"https:\\/\\/wa\\.me\\/"\\+WA\\+"\\?text="\\+encodeURIComponent\\(t\\)\\}/,
    "// wa() from options"
  )
  .replace(
    /document\\.querySelectorAll\\("\\[data-wa\\]"\\)\\.forEach\\(function\\(a\\)\\{a\\.href=wa\\("Olá! Quero saber mais sobre a Smarttable\\."\\);a\\.target="_blank";a\\.rel="noopener"\\}\\);/,
    `root.querySelectorAll("[data-wa]").forEach(function(a){
      a.setAttribute("href", wa("Olá! Quero saber mais sobre a Smarttable."));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.addEventListener("click", function(){
        options.onWhatsAppClick?.(a.getAttribute("data-track-cta") || a.className || "whatsapp");
      });
    });`
  )
  .replace(
    /document\\.getElementById\\("f"\\)\\.onsubmit=function\\(e\\)\\{e\\.preventDefault\\(\\);var d=new FormData\\(e\\.target\\);\\nwindow\\.open\\(wa\\("Olá! Quero 1 mês grátis da Smarttable\\.\\\\nNome: "\\+d\\.get\\("n"\\)\\+"\\\\nRestaurante: "\\+d\\.get\\("r"\\)\\+"\\\\nWhatsApp: "\\+d\\.get\\("t"\\)\\+"\\\\nMesas: "\\+d\\.get\\("m"\\)\\),"_blank"\\);document\\.getElementById\\("ok"\\)\\.style\\.display="block"\\};/,
    `const form = root.getElementById("f") as HTMLFormElement | null;
  if (form) {
    form.onsubmit = function (e) {
      e.preventDefault();
      const d = new FormData(form);
      options.onFormRedirect?.();
      options.onCtaClick?.("form_comecar_gratis");
      const ok = root.getElementById("ok") as HTMLElement | null;
      if (ok) ok.style.display = "block";
      const params = new URLSearchParams();
      const r = String(d.get("r") || "").trim();
      const t = String(d.get("t") || "").trim();
      if (r) params.set("restaurante", r);
      if (t) params.set("telefone", t);
      const q = params.toString();
      window.location.href = "/analise" + (q ? "?" + q : "");
    };
  }`
  )
  .replace(/document\\./g, "root.")
  .replace(/addEventListener\\(/g, "window.addEventListener(")
  .replace(/matchMedia\\(/g, "window.matchMedia(")
  .replace(/innerHeight/g, "window.innerHeight")
  .replace(/scrollY/g, "window.scrollY")
  .replace(/performance\\./g, "window.performance.")
  .replace(/requestAnimationFrame\\(/g, "window.requestAnimationFrame(")
  .replace(
    /function go\\(n,man\\)\\{/,
    `function go(n,man){ options.onDemoStep?.(n);`
  )
  .replace(
    /root\\.querySelectorAll\\("\\[data-wat\\]"\\)\\.forEach\\(function\\(a\\)\\{a\\.href=wa\\("Olá! Quero deixar o meu depoimento sobre a Smarttable\\."\\);a\\.target="_blank";a\\.rel="noopener"\\}\\);/,
    `root.querySelectorAll("[data-wat]").forEach(function(a){
      a.setAttribute("href", wa("Olá! Quero deixar o meu depoimento sobre a Smarttable."));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.addEventListener("click", function(){
        options.onWhatsAppClick?.("depoimento");
      });
    });`
  )}

  root.querySelectorAll("[data-cta=\\"start_free\\"]").forEach(function (el) {
    el.addEventListener("click", function () {
      options.onCtaClick?.(el.getAttribute("data-track-cta") || "start_free");
    });
  });

  return function cleanup() {
    cleanups.forEach(function (fn) { try { fn(); } catch (_) {} });
  };
}
`;

fs.writeFileSync(
  "c:/Users/Reginaldo Junior/Desktop/ssss/src/components/sales/initSalesLanding.ts",
  wrapped
);
console.log("wrote initSalesLanding.ts", wrapped.length);
