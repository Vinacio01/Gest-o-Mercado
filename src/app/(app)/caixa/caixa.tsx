"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adicionarItem,
  definirQuantidade,
  totalCentavos,
  totalDeUnidades,
  trocoCentavos,
  type ItemCarrinho,
  type ProdutoCaixa,
} from "@/lib/caixa";
import { paraCentavos } from "@/lib/format";
import { normalizarDinheiro } from "@/lib/validations/comum";
import type { FormaPagamento } from "@/lib/validations/vendas";

import { finalizarVendaAcao } from "./actions";
import { BuscaProduto } from "./busca-produto";
import { ItensVenda } from "./itens-venda";
import { PainelPagamento } from "./painel-pagamento";

/** Gera a chave de idempotência de uma venda nova. */
function novaChave() {
  return crypto.randomUUID();
}

export function Caixa({ produtos }: { produtos: ProdutoCaixa[] }) {
  const router = useRouter();
  const busca = useRef<HTMLInputElement>(null);
  const [processando, iniciar] = useTransition();

  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [recebido, setRecebido] = useState("");
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  // Criada ao iniciar a venda e mantida em novas tentativas: o banco não duplica.
  const [chave, setChave] = useState(novaChave);

  const total = totalCentavos(itens);
  const recebidoNormalizado = recebido.trim() ? normalizarDinheiro(recebido) : null;
  const recebidoInvalido = Boolean(recebido.trim()) && recebidoNormalizado === null;
  const troco =
    recebidoNormalizado !== null ? trocoCentavos(paraCentavos(recebidoNormalizado), total) : null;
  const trocoBloqueia = forma === "dinheiro" && Boolean(recebido.trim()) && troco === null;
  const podeFinalizar = itens.length > 0 && forma !== null && !trocoBloqueia && !processando;

  function focarBusca() {
    // Depois de fechar diálogos o Radix devolve o foco; esperamos um ciclo.
    setTimeout(() => busca.current?.focus(), 0);
  }

  function limparVenda() {
    setItens([]);
    setForma(null);
    setRecebido("");
    setChave(novaChave());
    focarBusca();
  }

  function adicionar(produto: ProdutoCaixa) {
    const resultado = adicionarItem(itens, produto);
    if (resultado.ok) setItens(resultado.itens);
    else toast.error(resultado.motivo);
  }

  function finalizar() {
    if (!podeFinalizar) return;
    const venda = {
      chave_idempotencia: chave,
      forma_pagamento: forma,
      itens: itens.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
    };

    const totalNaTela = total;

    iniciar(async () => {
      let resposta: Awaited<ReturnType<typeof finalizarVendaAcao>>;
      try {
        resposta = await finalizarVendaAcao(venda);
      } catch (erro) {
        // Falha de rede (internet caiu, servidor reiniciando): a venda PODE ter
        // sido gravada. Mantém o carrinho e a MESMA chave: tentar de novo
        // devolve a venda já gravada, sem duplicar.
        console.error("[caixa] falha de comunicação ao finalizar", erro);
        toast.error("Sem resposta do servidor. Confira a internet e aperte F2 de novo: a venda não será duplicada.", {
          duration: 10_000,
        });
        focarBusca();
        return;
      }

      if (resposta.ok) {
        if (resposta.jaRegistrada && resposta.totalCentavos !== totalNaTela) {
          // A primeira tentativa já tinha gravado a venda, e o carrinho mudou
          // depois: o que vale é a venda gravada, não a tela.
          toast.warning(`Esta venda já estava registrada com total ${resposta.total}. As alterações feitas depois não foram gravadas: se faltou algum item, registre numa nova venda.`, {
            duration: 15_000,
          });
        } else {
          toast.success(`Venda registrada: ${resposta.total}`, {
            description: resposta.jaRegistrada
              ? "Esta venda já tinha sido registrada; nada foi duplicado."
              : undefined,
          });
        }
        limparVenda();
        router.refresh(); // atualiza o estoque mostrado na busca
      } else {
        // A venda continua na tela, com a mesma chave: tentar de novo não duplica.
        toast.error(resposta.erro);
        focarBusca();
      }
    });
  }

  // Atalhos: F2 finaliza; Esc pede para cancelar a venda (com itens).
  // O ouvinte é registrado uma vez; a ref aponta sempre para as funções atuais.
  const atalhos = useRef({ finalizar, cancelar: () => {} });
  useEffect(() => {
    atalhos.current = {
      finalizar,
      cancelar: () => {
        // Com o diálogo aberto, o Esc é dele (fecha o diálogo).
        if (confirmandoCancelamento) return;
        if (itens.length > 0 && !processando) setConfirmandoCancelamento(true);
      },
    };
  });
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "F2") {
        evento.preventDefault();
        atalhos.current.finalizar();
      } else if (evento.key === "Escape" && !evento.defaultPrevented) {
        atalhos.current.cancelar();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <BuscaProduto
          ref={busca}
          produtos={produtos}
          aoEscolher={adicionar}
          aoNaoEncontrar={(texto) => toast.error(`Nenhum produto encontrado para "${texto}".`)}
        />
        <ItensVenda
          itens={itens}
          aoMudarQuantidade={(id, quantidade) => setItens(definirQuantidade(itens, id, quantidade))}
          aoRemover={(id) => {
            setItens(definirQuantidade(itens, id, 0));
            focarBusca();
          }}
        />
      </div>

      <PainelPagamento
        totalCentavos={total}
        unidades={totalDeUnidades(itens)}
        forma={forma}
        aoMudarForma={(f) => {
          setForma(f);
          if (f !== "dinheiro") setRecebido("");
        }}
        recebido={recebido}
        aoMudarRecebido={setRecebido}
        troco={troco}
        recebidoInvalido={recebidoInvalido}
        podeFinalizar={podeFinalizar}
        processando={processando}
        aoFinalizar={finalizar}
        aoCancelar={() => setConfirmandoCancelamento(true)}
        temItens={itens.length > 0}
      />

      <AlertDialog
        open={confirmandoCancelamento}
        onOpenChange={(aberto) => {
          setConfirmandoCancelamento(aberto);
          if (!aberto) focarBusca();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens serão removidos da tela. Nada foi registrado ainda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={limparVenda}>
              Cancelar venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
