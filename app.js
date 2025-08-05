let usuarioLogado = null;
let unsubscribeUsuario = null;

window.login = async function () {
  const cpf = document.getElementById('cpf-login').value;
  const senha = document.getElementById('senha-login').value;

  const ref = db.collection('usuarios').doc(cpf);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    alert('CPF não encontrado!');
    return;
  }

  const dados = snapshot.data();

  if (dados.senha === senha) {
    usuarioLogado = { cpf, ...dados };
    iniciarMonitoramentoUsuario(cpf); // inicia o listener real-time
    mostrarMenu();
  } else {
    alert('Senha incorreta!');
  }
}

window.cadastrar = async function () {
  const nome = document.getElementById('nome').value;
  const cpf = document.getElementById('cpf').value;
  const senha = document.getElementById('senha').value;

  const ref = db.collection('usuarios').doc(cpf);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    alert('CPF já cadastrado!');
    return;
  }

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
  alert('Cadastro realizado com sucesso!');
  mostrarLogin();
}

function atualizarInterface() {
  document.getElementById('usuario-nome').innerText = usuarioLogado.nome;
  document.getElementById('usuario-saldo').innerText = usuarioLogado.saldo.toFixed(2);
  document.getElementById('usuario-cdb').innerText = usuarioLogado.saldo_cdb.toFixed(2);
  document.getElementById('cartao-fatura').innerText = usuarioLogado.cartao.fatura.toFixed(2);
}

function mostrarMenu() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('cadastro').style.display = 'none';
  document.getElementById('menu').style.display = 'block';
  atualizarInterface();
}

window.logout = function () {
  if (unsubscribeUsuario) {
    unsubscribeUsuario(); // para o listener quando desloga
    unsubscribeUsuario = null;
  }
  usuarioLogado = null;
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('cadastro').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

window.mostrarCadastro = function () {
  document.getElementById('login').style.display = 'none';
  document.getElementById('cadastro').style.display = 'block';
}

window.fazerPix = async function () {
  const cpfDestino = document.getElementById('cpf-destino').value;
  const valor = parseFloat(document.getElementById('valor-pix').value);

  if (!cpfDestino || isNaN(valor) || valor <= 0) {
    alert('Preencha corretamente o CPF e valor.');
    return;
  }

  if (cpfDestino === usuarioLogado.cpf) {
    alert('Você não pode transferir para si mesmo.');
    return;
  }

  if (valor > usuarioLogado.saldo) {
    alert('Saldo insuficiente.');
    return;
  }

  const refDestino = db.collection('usuarios').doc(cpfDestino);
  const snapDestino = await refDestino.get();

  if (!snapDestino.exists) {
    alert('CPF de destino não encontrado.');
    return;
  }

  const usuarioDestino = snapDestino.data();

  // Atualizar saldos localmente antes do banco para evitar inconsistência visual
  usuarioLogado.saldo -= valor;
  usuarioDestino.saldo += valor;

  // Atualizar Firestore (atomicamente, ideal seria usar transaction, mas deixo simples aqui)
  await db.collection('usuarios').doc(usuarioLogado.cpf).set(usuarioLogado);
  await db.collection('usuarios').doc(cpfDestino).set(usuarioDestino);

  alert(`Pix de R$ ${valor.toFixed(2)} para ${usuarioDestino.nome} foi realizado com sucesso!`);
  atualizarInterface();
}

window.depositarCDB = async function () {
  const valor = parseFloat(document.getElementById('valor-cdb-deposito').value);
  if (isNaN(valor) || valor <= 0) {
    alert('Digite um valor válido para depósito.');
    return;
  }

  if (valor > usuarioLogado.saldo) {
    alert('Saldo insuficiente para depósito.');
    return;
  }

  usuarioLogado.saldo -= valor;
  usuarioLogado.saldo_cdb += valor;

  await db.collection('usuarios').doc(usuarioLogado.cpf).set(usuarioLogado);
  alert('Depósito no CDB realizado!');
  atualizarInterface();
}

window.sacarCDB = async function () {
  const valor = parseFloat(document.getElementById('valor-cdb-saque').value);
  if (isNaN(valor) || valor <= 0) {
    alert('Digite um valor válido para saque.');
    return;
  }

  if (valor > usuarioLogado.saldo_cdb) {
    alert('Saldo no CDB insuficiente.');
    return;
  }

  usuarioLogado.saldo_cdb -= valor;
  usuarioLogado.saldo += valor;

  await db.collection('usuarios').doc(usuarioLogado.cpf).set(usuarioLogado);
  alert('Saque do CDB realizado!');
  atualizarInterface();
}

// Variável para controlar alertas para não repetir infinitamente
let ultimoSaldoAlertado = 0;

// 🔔 Monitorar mudanças em tempo real do saldo
function iniciarMonitoramentoUsuario(cpf) {
  if (unsubscribeUsuario) unsubscribeUsuario(); // cancela listener anterior

  const ref = db.collection('usuarios').doc(cpf);

  unsubscribeUsuario = ref.onSnapshot((doc) => {
    if (doc.exists) {
      const novosDados = doc.data();

      // Se o saldo aumentou desde o último alert, notifica
      if (novosDados.saldo > usuarioLogado.saldo && novosDados.saldo > ultimoSaldoAlertado) {
        const valorRecebido = novosDados.saldo - usuarioLogado.saldo;
        alert(`Você recebeu um Pix de R$ ${valorRecebido.toFixed(2)}!`);
        ultimoSaldoAlertado = novosDados.saldo;
      }

      usuarioLogado = { cpf, ...novosDados };
      atualizarInterface();
    }
  });
}
