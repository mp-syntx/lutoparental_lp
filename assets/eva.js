/*
 * Base compartilhada da LP e do Diagnóstico (mesmo domínio):
 * configuração dos formulários da AC, envio por JSONP (proc.php, como o embed oficial),
 * UTMs da sessão e o registro local de que a pessoa já se cadastrou.
 *
 * `?teste=1` na URL liga o modo teste: valida e mostra os estados, mas não envia nada.
 */
(function () {
  // raiz do site, a partir do endereço deste script (funciona no domínio e na prévia do github.io)
  var RAIZ = new URL('..', (document.currentScript && document.currentScript.src) || location.href).href;
  var CONFIG = {
    endpoint: 'https://bastasentir.activehosted.com/proc.php',
    // formulário A "LP Luto no trabalho" (lista 9, tag 84) — preencher com os valores da AC
    cadastro: { u: '', f: '', or: '' },
    // formulário B "Diagnóstico de parentalidade" (lista 9, tag 85)
    diagnostico: { u: '', f: '', or: '' },
    // formulário 12 "Indique sua empresa" (pipeline 3, etapa 25)
    indicacao: { u: '6AD0222C091DC', f: '12', or: 'ebb93716-167b-475e-8b5d-b9a99d06cca9' },
    // PDF otimizado entregue pelo time da Eva
    pdfUrl: RAIZ + 'assets/doc/quando-o-luto-chega-ao-trabalho.pdf',
    diagnosticoUrl: RAIZ + 'diagnostico/',
    lpUrl: 'https://lutoparental.evamaternidade.com.br/'
  };

  // campos da AC
  var CAMPOS = {
    empresa: 'field[49]', porte: 'field[50]', cargo: 'field[51]',
    indNome: 'field[59]', indEmail: 'field[60]', podeCitar: 'field[63]', contexto: 'field[64]',
    diagTotal: 'field[70]', diagFaixa: 'field[71]',
    diagB: ['field[72]', 'field[73]', 'field[74]', 'field[75]', 'field[76]', 'field[77]'],
    diagMenor: 'field[78]', diagItens: 'field[79]', diagData: 'field[80]'
  };
  var UTM_CAMPOS = { utm_source: 'field[28]', utm_medium: 'field[26]', utm_campaign: 'field[27]', utm_content: 'field[57]' };

  var teste = /[?&]teste=1/.test(location.search);

  function guarda(tipo) {
    try { return window[tipo]; } catch (e) { return null; }
  }
  function ler(tipo, chave) {
    var s = guarda(tipo);
    try { return s ? JSON.parse(s.getItem(chave)) : null; } catch (e) { return null; }
  }
  function gravar(tipo, chave, valor) {
    var s = guarda(tipo);
    try { if (s) s.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem storage */ }
  }

  // UTMs da URL, guardadas na sessão para sobreviver à navegação LP → diagnóstico
  var utms = (function () {
    var KEY = 'evalp_utms';
    var atual = ler('sessionStorage', KEY) || {};
    var qs = new URLSearchParams(location.search), novas = {};
    Object.keys(UTM_CAMPOS).forEach(function (k) {
      var v = (qs.get(k) || '').trim();
      if (v) novas[k] = v.slice(0, 200);
    });
    if (Object.keys(novas).length) atual = novas;
    gravar('sessionStorage', KEY, atual);
    return atual;
  })();

  // cadastro feito neste aparelho (só nome, e-mail e empresa; nunca vai para URL)
  var KEY_CAD = 'evalp_cadastro_v1';
  function cadastro() { var c = ler('localStorage', KEY_CAD); return c && c.email ? c : null; }
  function salvarCadastro(c) { gravar('localStorage', KEY_CAD, c); }

  // envio por JSONP; um envio por vez (a AC responde chamando funções globais)
  var fila = Promise.resolve();
  function enviar(form, pares, opcoes) {
    opcoes = opcoes || {};
    var cfg = CONFIG[form];
    var extras = Object.keys(utms).filter(function (k) { return !(opcoes.utm && opcoes.utm[k]); })
      .map(function (k) { return [UTM_CAMPOS[k], utms[k]]; });
    if (opcoes.utm) Object.keys(opcoes.utm).forEach(function (k) { extras.push([UTM_CAMPOS[k], opcoes.utm[k]]); });
    var todos = pares.concat(extras);

    var tarefa = function () {
      return new Promise(function (ok, falha) {
        if (teste) {
          if (window.console) console.info('[eva] modo teste, nada enviado (' + form + '):', todos);
          setTimeout(ok, 500);
          return;
        }
        if (!cfg || !cfg.f) { falha(new Error('config')); return; }
        var p = [['u', cfg.u], ['f', cfg.f], ['s', ''], ['c', '0'], ['m', '0'], ['act', 'sub'], ['v', '2'], ['or', cfg.or]].concat(todos);
        var fim = false, timer, s = document.createElement('script');
        function acabou(fn, arg) { if (fim) return; fim = true; clearTimeout(timer); s.remove(); fn(arg); }
        window._show_thank_you = function () { acabou(ok); };
        window._show_unsubscribe = function () { acabou(ok); };
        window._show_error = function (id, msg) { acabou(falha, new Error(String(msg || '').replace(/<[^>]+>/g, ''))); };
        s.src = CONFIG.endpoint + '?' + p.map(function (x) {
          return encodeURIComponent(x[0]) + '=' + encodeURIComponent(x[1]);
        }).join('&') + '&jsonp=true';
        s.onerror = function () { acabou(falha, new Error('rede')); };
        timer = setTimeout(function () { acabou(falha, new Error('tempo')); }, 15000);
        document.head.appendChild(s);
      });
    };
    var r = fila.then(tarefa, tarefa);
    fila = r.catch(function () {});
    return r;
  }

  function telefone(v) { var d = String(v || '').replace(/\D/g, ''); return d.length >= 10 ? '+55' + d : ''; }
  function mascaraTel(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '').slice(0, 11), r = d;
      if (d.length > 2) r = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 6) r = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      input.value = r;
    });
  }

  function evento(nome, dados) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', nome, dados || {});
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: nome }, dados || {}));
    } catch (e) { /* sem analytics */ }
  }

  window.EVA = {
    config: CONFIG, campos: CAMPOS, teste: teste, utms: utms,
    cadastro: cadastro, salvarCadastro: salvarCadastro,
    enviar: enviar, telefone: telefone, mascaraTel: mascaraTel, evento: evento,
    EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  };
})();
