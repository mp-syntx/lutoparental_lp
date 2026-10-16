/*
 * Cadastro (formulário A da AC), usado na LP e no Diagnóstico.
 * EVA.iniciarCadastro(form, { origem, aoConcluir(cadastro) })
 * O formulário precisa ter os campos: nome, email, empresa, cargo, porte, tel (opcional).
 */
(function () {
  var MSG = {
    nome: 'Conte pra gente o seu nome.',
    email: 'Confira o e-mail.',
    empresa: 'Informe a empresa.',
    cargo: 'Escolha a sua área.',
    porte: 'Escolha o número de colaboradores.',
    tel: 'Confira o número com DDD.'
  };

  function erroCampo(c, msg) {
    var box = c.closest('.campo'), s = box && box.querySelector('.campo-err');
    if (msg) {
      if (box && !s) {
        s = document.createElement('span');
        s.className = 'campo-err';
        s.id = c.id + '-err';
        box.appendChild(s);
      }
      if (s) s.textContent = msg;
      c.setAttribute('aria-invalid', 'true');
      if (s) c.setAttribute('aria-describedby', s.id);
    } else {
      if (s) s.remove();
      c.removeAttribute('aria-invalid');
      c.removeAttribute('aria-describedby');
    }
  }

  EVA.validar = function (form, nomes) {
    var primeiro = null;
    nomes.forEach(function (n) {
      var c = form.elements[n];
      if (!c) return;
      var v = (c.value || '').trim(), msg = '';
      if (c.required && !v) msg = MSG[n] || 'Preencha este campo.';
      else if (v && c.type === 'email' && !EVA.EMAIL_RE.test(v)) msg = MSG.email;
      else if (v && c.type === 'tel' && v.replace(/\D/g, '').length < 10) msg = MSG.tel;
      else if (n === 'nome' && v && v.length < 2) msg = MSG.nome;
      erroCampo(c, msg);
      if (msg && !primeiro) primeiro = c;
    });
    if (primeiro) primeiro.focus();
    return !primeiro;
  };

  EVA.limparErros = function (form) {
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid')) erroCampo(e.target, '');
      var g = form.querySelector('.form-erro'); if (g) g.hidden = true;
    });
  };

  EVA.iniciarCadastro = function (form, opcoes) {
    opcoes = opcoes || {};
    var botao = form.querySelector('button[type=submit]');
    var rotulo = botao.innerHTML;
    var erro = form.querySelector('.form-erro');
    var enviando = false;
    if (form.elements.tel) EVA.mascaraTel(form.elements.tel);
    EVA.limparErros(form);

    var iniciou = false;
    form.addEventListener('focusin', function () {
      if (iniciou) return;
      iniciou = true;
      EVA.evento('cadastro_inicio', { origem: opcoes.origem || '' });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;
      if (erro) erro.hidden = true;
      if (!EVA.validar(form, ['nome', 'email', 'empresa', 'cargo', 'porte', 'tel'])) return;

      var v = function (n) { return (form.elements[n].value || '').trim(); };
      var pares = [
        ['fullname', v('nome')],
        ['email', v('email')],
        [EVA.campos.empresa, v('empresa')],
        [EVA.campos.cargo, v('cargo')],
        [EVA.campos.porte, v('porte')]
      ];
      var tel = EVA.telefone(v('tel'));
      if (tel) pares.push(['phone', tel]);

      enviando = true;
      botao.disabled = true;
      botao.textContent = 'Enviando…';
      EVA.enviar('cadastro', pares).then(function () {
        var c = { nome: v('nome').split(' ')[0], nomeCompleto: v('nome'), email: v('email'), empresa: v('empresa') };
        EVA.salvarCadastro(c);
        EVA.evento('cadastro_concluido', { origem: opcoes.origem || '' });
        enviando = false;
        botao.disabled = false;
        botao.innerHTML = rotulo;
        if (opcoes.aoConcluir) opcoes.aoConcluir(c);
      }, function (err) {
        enviando = false;
        botao.disabled = false;
        botao.innerHTML = rotulo;
        if (erro) {
          erro.textContent = err && err.message === 'config'
            ? 'O cadastro está sendo configurado. Tente de novo em alguns minutos.'
            : 'Não conseguimos concluir o cadastro. Verifique a conexão e tente de novo.';
          erro.hidden = false;
        }
      });
    });
  };
})();
