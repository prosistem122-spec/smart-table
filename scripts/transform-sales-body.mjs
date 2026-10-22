import fs from "fs";

const path =
  "c:/Users/Reginaldo Junior/Desktop/ssss/src/components/sales/sales-body.html";
let html = fs.readFileSync(path, "utf8");

html = html.replace(
  /<a class="btn" href="#acesso">Acesso grátis<\/a>/g,
  '<a class="btn" href="/analise" data-cta="start_free" data-track-cta="nav_comecar_gratis">Começar grátis</a>'
);

html = html.replace(
  /<a class="btn" href="#acesso">Quero o acesso grátis <i>→<\/i><\/a>/g,
  '<a class="btn" href="/analise" data-cta="start_free" data-track-cta="quero_acesso_gratis">Quero o acesso grátis <i>→</i></a>'
);

html = html.replace(
  /<button class="btn" type="submit">Quero o meu mês grátis <i>→<\/i><\/button>/,
  '<button class="btn" type="submit" data-cta="start_free" data-track-cta="form_comecar_gratis">Começar grátis <i>→</i></button>'
);

html = html.replace(
  /<p class="nt">Ao enviar, abrimos o WhatsApp com os seus dados já preenchidos\.<\/p>/,
  '<p class="nt">Ao continuar, identifica-se e inicia a análise gratuita do seu restaurante.</p>'
);

html = html.replace(
  /<div class="okm" id="ok">Quase lá! Confirme o envio no WhatsApp\.<\/div>/,
  '<div class="okm" id="ok">A redirecionar para a análise…</div>'
);

for (const id of [
  "inicio",
  "problema",
  "promessa",
  "prova",
  "acesso",
  "equipa",
]) {
  html = html.replace(`id="${id}"`, `id="${id}" data-section="${id}"`);
}

fs.writeFileSync(path, html);
console.log("transformed ok");
