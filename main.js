(function () {
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var cartao = $('#cartao');
  var passoCad = $('#passo-cadastro');
  var passoOk = $('#passo-ok');
  var desktop = window.matchMedia('(min-width:1100px)');

  // links dos materiais
  document.querySelectorAll('[data-pdf]').forEach(function (a) {
    a.href = EVA.config.pdfUrl;
    a.addEventListener('click', function () { EVA.evento('ebook_download'); });
  });

  // o diagnóstico pede cadastro depois do bloco 1; daqui, só leva até ele
  document.querySelectorAll('[data-diag]').forEach(function (a) {
    a.href = EVA.config.diagnosticoUrl;
    a.addEventListener('click', function () { EVA.evento('diagnostico_clique', { origem: 'lp' }); });
  });

  // botões que chamam o cadastro: no desktop o cartão já está visível, então só destaca
  document.querySelectorAll('[data-ir-form]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!desktop.matches) return;
      e.preventDefault();
      cartao.classList.remove('chama'); void cartao.offsetWidth; cartao.classList.add('chama');
      var f = $('input', passoCad.hidden ? passoOk : passoCad);
      if (f) f.focus({ preventScroll: true });
    });
  });

  function mostrarOk(c, foco) {
    passoCad.hidden = true;
    passoOk.hidden = false;
    $('[data-nome]', passoOk).textContent = c && c.nome ? ', ' + c.nome : '';
    var emp = $('#i-empresa');
    if (emp && c && c.empresa && !emp.value) emp.value = c.empresa;
    if (foco) passoOk.focus({ preventScroll: desktop.matches });
  }

  var jaCad = EVA.cadastro();
  if (jaCad) mostrarOk(jaCad, false);
  EVA.iniciarCadastro($('#form-cadastro'), { origem: 'lp', aoConcluir: function (c) { mostrarOk(c, true); } });

  // indicação para lideranças (formulário 12, o mesmo do Indique)
  var abrir = $('#indica-abrir'), fInd = $('#form-indica'), okInd = $('#indica-ok');
  EVA.mascaraTel(fInd.elements.tel);
  EVA.limparErros(fInd);
  abrir.addEventListener('click', function () {
    var aberto = fInd.hidden;
    fInd.hidden = !aberto;
    abrir.setAttribute('aria-expanded', String(aberto));
    if (aberto) { okInd.hidden = true; fInd.elements.nome.focus(); EVA.evento('indicacao_inicio'); }
  });
  fInd.addEventListener('submit', function (e) {
    e.preventDefault();
    var erro = $('.form-erro', fInd), botao = $('button[type=submit]', fInd);
    erro.hidden = true;
    if (!EVA.validar(fInd, ['nome', 'email', 'cargo', 'empresa', 'tel'])) return;
    var c = EVA.cadastro() || {};
    var v = function (n) { return (fInd.elements[n].value || '').trim(); };
    if (c.email && v('email').toLowerCase() === c.email.toLowerCase()) {
      erro.textContent = 'Esse é o seu e-mail. Informe o e-mail da pessoa indicada.';
      erro.hidden = false;
      return;
    }
    var pares = [
      ['fullname', v('nome')],
      ['email', v('email')],
      [EVA.campos.cargo, v('cargo')],
      [EVA.campos.empresa, v('empresa')],
      [EVA.campos.indNome, c.nomeCompleto || c.nome || ''],
      [EVA.campos.indEmail, c.email || ''],
      [EVA.campos.podeCitar, 'Sim'],
      [EVA.campos.contexto, 'Indicação do e-book Quando o luto chega ao trabalho']
    ];
    var tel = EVA.telefone(v('tel'));
    if (tel) pares.push(['phone', tel]);
    botao.disabled = true; botao.textContent = 'Enviando…';
    EVA.enviar('indicacao', pares, { utm: { utm_source: 'lutoparental', utm_content: 'indicacao-material' } }).then(function () {
      var nome = v('nome').split(' ')[0];
      ['nome', 'email', 'cargo', 'tel'].forEach(function (n) { fInd.elements[n].value = ''; });
      fInd.hidden = true;
      abrir.setAttribute('aria-expanded', 'false');
      abrir.innerHTML = 'Indicar outra pessoa <span aria-hidden="true">+</span>';
      okInd.textContent = 'Indicação enviada. ' + nome + ' vai receber o guia por e-mail, em seu nome.';
      okInd.hidden = false;
      botao.disabled = false; botao.textContent = 'Enviar indicação';
      EVA.evento('indicacao_concluida');
    }, function () {
      botao.disabled = false; botao.textContent = 'Enviar indicação';
      erro.textContent = 'Não conseguimos enviar a indicação. Verifique a conexão e tente de novo.';
      erro.hidden = false;
    });
  });

  // revelação ao rolar
  var revs = document.querySelectorAll('[data-rev]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revs.forEach(function (r, i) { r.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(r); });

    // barra do celular: aparece quando o hero e o cartão estão fora da tela
    var barra = $('#barra'), visiveis = new Set();
    var ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visiveis.add(e.target); else visiveis.delete(e.target); });
      var mostra = !desktop.matches && visiveis.size === 0;
      barra.classList.toggle('vis', mostra);
      barra.setAttribute('aria-hidden', String(!mostra));
      $('a', barra).tabIndex = mostra ? 0 : -1;
    });
    ob.observe($('#topo')); ob.observe($('#cadastro')); ob.observe($('.final'));
  } else {
    revs.forEach(function (r) { r.classList.add('vis'); });
  }
})();
