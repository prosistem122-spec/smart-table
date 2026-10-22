export type SalesInitOptions = {
  whatsappNumber: string;
  onCtaClick?: (element: string) => void;
  onDemoStep?: (step: number, manual: boolean) => void;
  onWhatsAppClick?: (element: string) => void;
  onFormRedirect?: () => void;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Inicializa animações e interações da página de vendas (portado do HTML original). */
export function initSalesLanding(options: SalesInitOptions): () => void {
  const WA = digitsOnly(options.whatsappNumber || "258853003836");
  const wa = (t: string) =>
    `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

  const listeners: Array<() => void> = [];
  const on = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    opts?: AddEventListenerOptions | boolean
  ) => {
    target.addEventListener(type, handler, opts);
    listeners.push(() => target.removeEventListener(type, handler, opts));
  };

  document.querySelectorAll<HTMLAnchorElement>("[data-wa]").forEach((a) => {
    a.href = wa("Olá! Quero saber mais sobre a Smarttable.");
    a.target = "_blank";
    a.rel = "noopener";
    on(a, "click", () => {
      options.onWhatsAppClick?.(
        a.getAttribute("data-track-cta") || "whatsapp"
      );
    });
  });

  document.querySelectorAll<HTMLAnchorElement>("[data-wat]").forEach((a) => {
    a.href = wa("Olá! Quero deixar o meu depoimento sobre a Smarttable.");
    a.target = "_blank";
    a.rel = "noopener";
    on(a, "click", () => options.onWhatsAppClick?.("depoimento"));
  });

  const form = document.getElementById("f") as HTMLFormElement | null;
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const d = new FormData(form);
      options.onFormRedirect?.();
      options.onCtaClick?.("form_comecar_gratis");
      const ok = document.getElementById("ok");
      if (ok) (ok as HTMLElement).style.display = "block";
      const params = new URLSearchParams();
      const r = String(d.get("r") || "").trim();
      const t = String(d.get("t") || "").trim();
      if (r) params.set("restaurante", r);
      if (t) params.set("telefone", t);
      const q = params.toString();
      window.location.href = `/analise${q ? `?${q}` : ""}`;
    };
  }

  document.querySelectorAll("[data-cta='start_free']").forEach((el) => {
    on(el, "click", () => {
      options.onCtaClick?.(
        el.getAttribute("data-track-cta") || "start_free"
      );
    });
  });

  // QR demo
  (() => {
    const qr = document.getElementById("qr");
    if (!qr) return;
    const n = 21;
    let h = "",
      x = 7;
    const r = () => {
      x = (x * 1103515245 + 12345) & 2147483647;
      return x % 100;
    };
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const f =
          (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
        let onCell: boolean;
        if (f) {
          const a = Math.abs(i < 7 ? i - 3 : i - 17);
          const b = Math.abs(j < 7 ? j - 3 : j - 17);
          onCell = Math.max(a, b) !== 2;
        } else onCell = r() > 50;
        if (onCell)
          h += `<rect x="${j}" y="${i}" width="1.03" height="1.03"/>`;
      }
    }
    qr.insertAdjacentHTML(
      "afterbegin",
      `<svg viewBox="0 0 21 21" fill="#0a0a0a">${h}</svg>`
    );
  })();

  const fit = document.getElementById("fit");
  const st = document.getElementById("st");
  let KIND = "c";
  let storyTimer: ReturnType<typeof setTimeout> | undefined;
  const observers: IntersectionObserver[] = [];

  function rs() {
    if (!fit || !st || !fit.parentElement) return;
    const W = fit.parentElement.clientWidth;
    let s: number,
      tx = 0,
      ty = 0,
      H: number;
    if (W >= 700) {
      const top = fit.getBoundingClientRect().top + window.scrollY;
      s = Math.min(
        1,
        W / 860,
        Math.max(0.72, (window.innerHeight - top - 110) / 490)
      );
      fit.style.width = `${860 * s}px`;
      H = 494 * s;
    } else {
      const cs = Math.min(1.05, W / 250);
      fit.style.width = "100%";
      H = 494 * cs;
      if (KIND === "c") {
        s = cs;
        tx = (W - 232 * s) / 2;
      } else {
        s = W / 740;
        tx = -140 * s + (W - 720 * s) / 2;
        ty = (H - 430 * s) / 2;
      }
    }
    st.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
    fit.style.height = `${Math.round(H)}px`;
  }

  if (fit && st) {
    rs();
    on(window, "resize", rs);
    on(window, "load", rs);
  }

  // Demo story (6 steps)
  if (fit && st) {
    const T: [string, string, string][] = [
      [
        "O cliente escaneia o QR Code",
        "Aponta a câmara à mesa e o menu abre na hora. Sem baixar nada.",
        "c",
      ],
      [
        "Conversa com o garçom IA",
        "Ele entende o gosto do cliente e sugere pratos e bebidas. O ticket médio sobe.",
        "c",
      ],
      [
        "Envia o pedido",
        "O pedido cai direto no ecrã do restaurante. Ninguém precisa de anotar.",
        "c",
      ],
      [
        "O restaurante prepara, o cliente acompanha",
        "Cada etapa aparece nos dois ecrãs em tempo real.",
        "r",
      ],
      [
        "Chama o garçom ou pede a conta",
        "Dois botões resolvem. O restaurante é avisado na hora.",
        "c",
      ],
      [
        "Tudo registado na gestão",
        "Vendas, stock e faturação num só painel.",
        "r",
      ],
    ];
    const D = [3800, 5800, 4200, 5400, 5200, 5600];
    const cn = document.getElementById("cn");
    const ct = document.getElementById("ct");
    const cd = document.getElementById("cd");
    const seg = document.getElementById("seg");
    const rp = document.getElementById("rp");
    const mon = document.getElementById("mon");
    const ph = document.getElementById("ph");
    const sC = document.getElementById("sC");
    const sR = document.getElementById("sR");
    const en = document.getElementById("en");
    const els = st.querySelectorAll<HTMLElement>("[data-st]");
    const bs: HTMLButtonElement[] = [];
    let started = false;
    const red = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    function go(n: number, man: boolean) {
      clearTimeout(storyTimer);
      options.onDemoStep?.(n, man);
      st!.dataset.s = "";
      void st!.offsetWidth;
      st!.dataset.s = String(n);
      rp?.classList.remove("on");
      en?.classList.remove("on");
      els.forEach((e) => {
        const onStep =
          (e.dataset.st || "").split(" ").indexOf(String(n)) > -1;
        e.classList.remove("on");
        if (onStep) {
          void e.offsetWidth;
          e.classList.add("on");
        }
      });
      const t = T[n - 1];
      const c = t[2] === "c";
      if (cn) cn.textContent = `${n}/${T.length}`;
      if (ct) ct.textContent = t[0];
      if (cd) cd.textContent = t[1];
      sC?.classList.toggle("on", c);
      sR?.classList.toggle("on", !c);
      mon?.classList.toggle("dim", n < 3);
      ph?.classList.toggle("gone", n === 6);
      mon?.classList.toggle("hid", c);
      ph?.classList.toggle("hid", !c);
      KIND = c ? "c" : "r";
      rs();
      bs.forEach((b, j) => {
        b.className = j < n - 1 ? "d" : "";
        b.style.setProperty("--t", `${D[n - 1]}ms`);
      });
      if (!man && !red) {
        void bs[n - 1].offsetWidth;
        bs[n - 1].classList.add("a");
      } else if (man) {
        bs[n - 1].classList.add("d");
      }
      if (man || red) return;
      storyTimer = setTimeout(() => {
        if (n < T.length) go(n + 1, false);
        else {
          bs[n - 1].className = "d";
          rp?.classList.add("on");
          en?.classList.add("on");
        }
      }, D[n - 1]);
    }

    T.forEach((_, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Passo ${k + 1}`);
      b.onclick = () => go(k + 1, true);
      seg?.appendChild(b);
      bs.push(b);
    });

    if (rp) rp.onclick = () => go(1, true);
    const again = document.getElementById("again");
    if (again) again.onclick = () => go(1, true);

    const demoIo = new IntersectionObserver(
      (es, o) => {
        if (es[0]?.isIntersecting && !started) {
          started = true;
          o.disconnect();
          go(1, false);
        }
      },
      { threshold: 0.25 }
    );
    demoIo.observe(fit);
    observers.push(demoIo);

    if (cn) cn.textContent = "1/6";
    if (ct) ct.textContent = T[0][0];
    if (cd) cd.textContent = T[0][1];
    sC?.classList.add("on");
    mon?.classList.add("dim", "hid");
  }

  // Reveal animations
  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          const t = e.target as HTMLElement;
          t.classList.add("in");
          setTimeout(() => {
            t.style.transitionDelay = "";
          }, 1100);
          io.unobserve(t);
        }
      });
    },
    { threshold: 0.15 }
  );
  observers.push(io);
  document
    .querySelectorAll("section h2,section .sub,section .k,.ck li")
    .forEach((e) => e.classList.add("rv"));
  document.querySelectorAll(".rv").forEach((e) => {
    const parent = e.parentNode;
    if (parent) {
      (e as HTMLElement).style.transitionDelay = `${
        (Array.prototype.indexOf.call(parent.children, e) % 4) * 100
      }ms`;
    }
    io.observe(e);
  });

  // Nav section highlight
  const ls = document.querySelectorAll<HTMLAnchorElement>("nav ul a");
  const sc: (Element | null)[] = [];
  ls.forEach((a) => {
    const href = a.getAttribute("href");
    sc.push(href ? document.querySelector(href) : null);
  });
  const so = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          ls.forEach((a, k) => a.classList.toggle("on", sc[k] === e.target));
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  observers.push(so);
  sc.forEach((x) => x && so.observe(x));

  // Ticker
  const tk = document.getElementById("tk");
  if (tk) {
    const L = [
      "Menu digital por QR Code",
      "Garçom virtual com IA",
      "Pedidos em tempo real",
      "Chamar garçom e pedir conta",
      "Acompanhamento do pedido",
      "Gestão de stock",
      "Faturação",
      "Painel de vendas",
    ];
    let h = "";
    for (let r = 0; r < 2; r++) {
      L.forEach((x) => {
        h += `<span>${x}</span><svg class="sp"><use href="#sp"/></svg>`;
      });
    }
    tk.innerHTML = h;
  }

  // Carousels
  const redMotion = window.matchMedia(
    "(prefers-reduced-motion:reduce)"
  ).matches;
  let rafId = 0;

  function carousel(el: HTMLElement | null) {
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    let pos = 0,
      setW = 0,
      last = -1e9,
      drag = false,
      vis = true,
      t0 = 0,
      sx = 0,
      sl = 0,
      ready = false;

    function build() {
      const gap = parseFloat(getComputedStyle(el!).columnGap) || 0;
      setW = items.reduce((w, i) => w + i.offsetWidth + gap, 0);
      if (!setW) return;
      const sets = Math.ceil(el!.clientWidth / setW) + 2;
      for (let k = 1; k < sets; k++) {
        items.forEach((i) => {
          const c = i.cloneNode(true) as HTMLElement;
          c.setAttribute("aria-hidden", "true");
          c.classList.add("in");
          el!.appendChild(c);
        });
      }
      pos = el!.scrollLeft = setW;
      ready = true;
    }

    function wrap() {
      if (pos >= 2 * setW) {
        pos -= setW;
        el!.scrollLeft = pos;
      } else if (pos <= 0) {
        pos += setW;
        el!.scrollLeft = pos;
      }
    }

    on(el, "pointerenter", ((e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        /* hover pause handled via drag/last */
      }
    }) as EventListener);
    on(el, "pointerleave", ((e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        drag = false;
        el!.classList.remove("drag");
      }
    }) as EventListener);
    on(el, "pointerdown", ((e: PointerEvent) => {
      last = performance.now();
      if (e.pointerType === "mouse") {
        drag = true;
        sx = e.clientX;
        sl = el!.scrollLeft;
        el!.classList.add("drag");
      }
    }) as EventListener);
    on(window, "pointerup", () => {
      drag = false;
      el!.classList.remove("drag");
    });
    on(el, "pointermove", ((e: PointerEvent) => {
      if (drag && e.pointerType === "mouse") {
        el!.scrollLeft = sl - (e.clientX - sx);
        last = performance.now();
      }
    }) as EventListener);
    on(el, "touchstart", () => {
      last = performance.now();
    }, { passive: true });
    on(el, "wheel", () => {
      last = performance.now();
    }, { passive: true });
    on(el, "scroll", () => {
      if (!ready) return;
      if (Math.abs(el!.scrollLeft - pos) > 2) {
        pos = el!.scrollLeft;
        last = performance.now();
      }
      wrap();
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      const cio = new IntersectionObserver((en) => {
        vis = !!en[0]?.isIntersecting;
      });
      cio.observe(el);
      observers.push(cio);
    }

    function tick(t: number) {
      const dt = Math.min(t - t0, 60);
      t0 = t;
      if (ready && vis && !redMotion && !drag && t - last > 5000) {
        pos += dt * 0.024;
        el!.scrollLeft = pos;
        wrap();
      }
      rafId = requestAnimationFrame(tick);
    }

    const start = () => {
      build();
      rafId = requestAnimationFrame((t) => {
        t0 = t;
        tick(t);
      });
    };
    if (document.readyState === "complete") start();
    else on(window, "load", start);
  }

  carousel(document.querySelector(".q"));
  carousel(document.querySelector("#equipa .ppl"));

  return () => {
    clearTimeout(storyTimer);
    cancelAnimationFrame(rafId);
    observers.forEach((o) => o.disconnect());
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    if (form) form.onsubmit = null;
  };
}
