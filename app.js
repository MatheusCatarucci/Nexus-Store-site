import { db } from './firebase-config.js';
import {
  doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let usuarioLogado = null;

window.login = async function () {
  const cpf = document.getElementById('cpf-login').value;
  const senha = document.getElementById('senha-login').value;

  const ref = doc(db, 'usuarios', cpf);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    alert('CPF não encontrado!');
    return;
  }

  const dados = snapshot.data();

  if (dados.senha === senha) {
    usuarioLogado = { cpf, ...dados };
    mostrarMenu();
  } else {
    alert('Senha incorreta!');
  }
}

window.cadastrar = async function () {
  const nome = document.getElementById('nome').value;
  const cpf = document.getElementById('cpf').value;
  const senha = document.getElementById('senha').value;

  const ref = doc(db, 'usuarios', cpf);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
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

  await setDoc(ref, dados);
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

  const refDestino = doc(db, 'usuarios', cpfDestino);
  const snapDestino = await getDoc(refDestino);

  if (!snapDestino.exists()) {
    alert('CPF de destino não encontrado.');
    return;
  }

  const usuarioDestino = snapDestino.data();

  // Atualizar saldos
  usuarioLogado.saldo -= valor;
  usuarioDestino.saldo += valor;

  // Atualizar Firestore
  await setDoc(doc(db, 'usuarios', usuarioLogado.cpf), usuarioLogado);
  await setDoc(doc(db, 'usuarios', cpfDestino), usuarioDestino);

  alert(`Pix de R$ ${valor.toFixed(2)} enviado com sucesso!`);
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

  await setDoc(doc(db, 'usuarios', usuarioLogado.cpf), usuarioLogado);
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

  await setDoc(doc(db, 'usuarios', usuarioLogado.cpf), usuarioLogado);
  alert('Saque do CDB realizado!');
  atualizarInterface();
}
