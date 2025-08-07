let usuarioLogado = null;
let unsubscribeUsuario = null;
let ultimoSaldoAlertado = 0;

// Pop-up animado
function mostrarPopup(mensagem) {
  const popup = document.getElementById('popup');
  popup.innerText = mensagem;
  popup.classList.remove('hidden');
  popup.classList.add('show');

  setTimeout(() => {
    popup.classList.remove('show');
    popup.classList.add('hidden');
  }, 3000);
}

// Máscara de CPF
function aplicarMascaraCPF(input) {
  input.addEventListener('input', () => {
    let valor = input.value.replace(/\D/g, '').slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = valor;
  });
}

['cpf-login', 'cpf', 'cpf-destino'].forEach(id => {
  const el = document.getElementById(id);
  if (el) aplicarMascaraCPF(el);
});

// Tema escuro
const toggle = document.getElementById("theme-toggle");
toggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", toggle.checked);
});

// Login com Enter
document.getElementById('cpf-login').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('senha-login').focus();
});
document.getElementById('senha-login').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

// Login
window.login = async function () {
  const cpf = document.getElementById('cpf-login').value;
  const senha = document.getElementById('senha-login').value;

  const ref = db.collection('usuarios').doc(cpf);
  const snapshot = await ref.get();

  if (!snapshot.exists) return mostrarPopup('CPF não encontrado!');

  const dados = snapshot.data();
  if (dados.senha === senha) {
    usuarioLogado = { cpf, ...dados };
    ultimoSaldoAlertado = usuarioLogado.saldo;
    iniciarMonitoramentoUsuario(cpf);
    mostrarMenu();
    document.getElementById('cpf-login').value = '';
    document.getElementById('senha-login').value = '';
  } else {
    mostrarPopup('Senha incorreta!');
  }
};

// Cadastro
window.cadastrar = async function () {
  const nome = document.getElementById('nome').value;
  const cpf = document.getElementById('cpf').value;
  const senha = document.getElementById('senha').value;

  const ref = db.collection('usuarios').doc(cpf);
  const snapshot = await ref.get();
  if (snapshot.exists) return mostrarPopup('CPF já cadastrado!');

  const dados = {
    nome,
    senha,
    saldo: 50000,
    saldo_cdb: 0,
    cartao: {
      limite_total: 120000,
      limite_disponivel: 120000,
      fatura: 0
    }
  };

  await ref.set(dados);
  mostrarPopup('Cadastro realizado com sucesso!');
  document.getElementById('nome').value = '';
  document.getElementById('cpf').value = '';
  document.getElementById('senha').value = '';
  mostrarLogin();
};

// Atualiza interface
function atualizarInterface() {
  document.getElementById('usuario-nome').innerText = usuarioLogado.nome;
  document.getElementById('usuario-saldo').innerText = usuarioLogado.saldo.toFixed(2);
  document.getElementById('usuario-cdb').innerText = usuarioLogado.saldo_cdb.toFixed(2);
  document.getElementById('cartao-fatura').innerText = usuarioLogado.cartao.fatura.toFixed(2);
}

// Navegação
function mostrarMenu() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('cadastro').style.display = 'none';
  document.getElementById('menu').style.display = 'block';
  atualizarInterface();
}

function mostrarLogin() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('cadastro').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

window.mostrarCadastro = function () {
  document.getElementById('login').style.display = 'none';
  document.getElementById('cadastro').style.display = 'block';
};

window.logout = function () {
  if (unsubscribeUsuario) unsubscribeUsuario();
  usuarioLogado = null;
  mostrarLogin();
};

// Pix
window.fazerPix = async function () {
  const cpfDestino = document.getElementById('cpf-destino').value;
  const valor = parseFloat(document.getElementById('valor-pix').value);

  if (!cpfDestino || isNaN(valor) || valor <= 0) return mostrarPopup('Preencha corretamente o CPF e valor.');
  if (cpfDestino === usuarioLogado.cpf) return mostrarPopup('Você não pode transferir para si mesmo.');
  if (valor > usuarioLogado.saldo) return mostrarPopup('Saldo insuficiente.');

  const refDestino = db.collection('usuarios').doc(cpfDestino);
  const snapDestino = await refDestino.get();
  if (!snapDestino.exists) return mostrarPopup('CPF de destino não encontrado.');

  const usuarioDestino = snapDestino.data();
  usuarioLogado.saldo -= valor;
  usuarioDestino.saldo += valor;
  usuarioDestino.ultimoPixRemetente = usuarioLogado.nome;

  await db.collection('usuarios').doc(usuarioLogado.cpf).update({
    saldo: usuarioLogado.saldo
  });

  await db.collection('usuarios').doc(cpfDestino).update({
    saldo: usuarioDestino.saldo,
    ultimoPixRemetente: usuarioDestino.ultimoPixRemetente
  });

  mostrarPopup(`Pix de R$ ${valor.toFixed(2)} para ${usuarioDestino.nome} realizado com sucesso!`);
  document.getElementById('cpf-destino').value = '';
  document.getElementById('valor-pix').value = '';
  atualizarInterface();
};

// Depósito CDB
window.depositarCDB = async function () {
  const valor = parseFloat(document.getElementById('valor-cdb-deposito').value);
  if (isNaN(valor) || valor <= 0) return mostrarPopup('Digite um valor válido para depósito.');
  if (valor > usuarioLogado.saldo) return mostrarPopup('Saldo insuficiente para depósito.');

  usuarioLogado.saldo -= valor;
  usuarioLogado.saldo_cdb += valor;

  await db.collection('usuarios').doc(usuarioLogado.cpf).update({
    saldo: usuarioLogado.saldo,
    saldo_cdb: usuarioLogado.saldo_cdb
  });

  mostrarPopup('Depósito no CDB realizado!');
  document.getElementById('valor-cdb-deposito').value = '';
  atualizarInterface();
};

// Saque CDB
window.sacarCDB = async function () {
  const valor = parseFloat(document.getElementById('valor-cdb-saque').value);
  if (isNaN(valor) || valor <= 0) return mostrarPopup('Digite um valor válido para saque.');
  if (valor > usuarioLogado.saldo_cdb) return mostrarPopup('Saldo no CDB insuficiente.');

  usuarioLogado.saldo_cdb -= valor;
  usuarioLogado.saldo += valor;

  await db.collection('usuarios').doc(usuarioLogado.cpf).update({
    saldo: usuarioLogado.saldo,
    saldo_cdb: usuarioLogado.saldo_cdb
  });

  mostrarPopup('Saque do CDB realizado!');
  document.getElementById('valor-cdb-saque').value = '';
  atualizarInterface();
};

// Monitoramento em tempo real
function iniciarMonitoramentoUsuario(cpf) {
  if (unsubscribeUsuario) unsubscribeUsuario();

  const ref = db.collection('usuarios').doc(cpf);
  unsubscribeUsuario = ref.onSnapshot((doc) => {
    if (doc.exists) {
      const novosDados = doc.data();

      if (novosDados.saldo > usuarioLogado.saldo && novosDados.saldo > ultimoSaldoAlertado) {
        const valorRecebido = novosDados.saldo - usuarioLogado.saldo;
        const remetente = novosDados.ultimoPixRemetente || "alguém";
        mostrarPopup(`Você recebeu um Pix de R$ ${valorRecebido.toFixed(2)} de ${remetente}!`);
        ultimoSaldoAlertado = novosDados.saldo;
      }

      usuarioLogado = { cpf, ...novosDados };
      atualizarInterface();
    }
  });
}
