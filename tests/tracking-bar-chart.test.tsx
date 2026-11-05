import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrackingBarChart } from "@/components/admin/TrackingBarChart";

describe("gráfico de barras do rastreamento", () => {
  it("escala os valores e apresenta os rótulos", () => {
    const html = renderToStaticMarkup(<TrackingBarChart title="Percurso" description="Visitantes" rows={[{ label: "Landing", value: 10 }, { label: "Análise", value: 5 }]} />);
    expect(html).toContain("Landing");
    expect(html).toContain("width:100%");
    expect(html).toContain("width:50%");
  });
  it("distingue ausência de dados de duração zero", () => {
    const empty = renderToStaticMarkup(<TrackingBarChart title="Tempo" description="" rows={[{ label: "Etapa", value: 0 }]} />);
    expect(empty).toContain("Ainda não há dados");
    const zero = renderToStaticMarkup(<TrackingBarChart title="Tempo" description="" hasData rows={[{ label: "Etapa", value: 0, valueLabel: "0s" }]} />);
    expect(zero).toContain("0s");
    expect(zero).not.toContain("NaN");
  });
});
