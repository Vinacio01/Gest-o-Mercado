"use client";

import { startTransition as iniciarTransicao, useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResultadoAcao } from "@/hooks/use-resultado-acao";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/lib/estado-formulario";
import { ROTULO_UNIDADE, UNIDADES } from "@/lib/validations/produtos";

type Categoria = { id: string; nome: string };

/** Valores já formatados para os campos (preços como "12,50"). */
export type ValoresProduto = {
  nome: string;
  descricao: string;
  categoria_id: string;
  codigo_barras: string;
  unidade: string;
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: string;
};

type Props = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  categorias: Categoria[];
  valores?: ValoresProduto;
  /** Cadastro mostra o campo "Estoque inicial"; edição não. */
  modo: "novo" | "edicao";
};

const SEM_CATEGORIA = "sem-categoria";

export function FormularioProduto({ acao, categorias, valores, modo }: Props) {
  const router = useRouter();
  const [estado, enviar, pendente] = useActionState(acao, ESTADO_INICIAL);
  const erros = estado.campos ?? {};

  useResultadoAcao(estado, () => router.push("/produtos"));

  // Envio pelo onSubmit (e não por <form action>): assim o React não limpa os
  // campos depois do envio e o usuário não perde o que digitou se houver erro.
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    iniciarTransicao(() => enviar(dados));
  }

  const propsCampo = (nome: string) => ({
    id: nome,
    name: nome,
    "aria-invalid": erros[nome] ? true : undefined,
    "aria-describedby": erros[nome] ? `${nome}-erro` : undefined,
  });

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Dados do produto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome" rotulo="Nome" erro={erros.nome} className="sm:col-span-2">
            <Input
              {...propsCampo("nome")}
              defaultValue={valores?.nome}
              placeholder="Ex.: Arroz Tipo 1 5 kg"
              autoFocus={modo === "novo"}
              required
              maxLength={120}
            />
          </Campo>

          <Campo
            id="codigo_barras"
            rotulo="Código de barras"
            erro={erros.codigo_barras}
            ajuda="Opcional. Use o leitor ou digite."
          >
            <Input
              {...propsCampo("codigo_barras")}
              defaultValue={valores?.codigo_barras}
              inputMode="numeric"
              maxLength={50}
            />
          </Campo>

          <Campo id="categoria_id" rotulo="Categoria" erro={erros.categoria_id}>
            <SeletorCategoria
              categorias={categorias}
              valorInicial={valores?.categoria_id ?? ""}
            />
          </Campo>

          <Campo
            id="descricao"
            rotulo="Descrição"
            erro={erros.descricao}
            ajuda="Opcional."
            className="sm:col-span-2"
          >
            <Textarea
              {...propsCampo("descricao")}
              defaultValue={valores?.descricao}
              rows={2}
              maxLength={500}
            />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preços</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Campo id="preco_custo" rotulo="Preço de custo (R$)" erro={erros.preco_custo}>
              <Input
                {...propsCampo("preco_custo")}
                defaultValue={valores?.preco_custo ?? "0,00"}
                inputMode="decimal"
                required
              />
            </Campo>
            <Campo id="preco_venda" rotulo="Preço de venda (R$)" erro={erros.preco_venda}>
              <Input
                {...propsCampo("preco_venda")}
                defaultValue={valores?.preco_venda}
                inputMode="decimal"
                placeholder="0,00"
                required
              />
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Campo id="unidade" rotulo="Unidade" erro={erros.unidade}>
              <Select name="unidade" defaultValue={valores?.unidade ?? "un"}>
                <SelectTrigger id="unidade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {ROTULO_UNIDADE[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id="estoque_minimo"
              rotulo="Estoque mínimo"
              erro={erros.estoque_minimo}
              ajuda="Ao chegar nesse número, o proprietário recebe um alerta."
            >
              <Input
                {...propsCampo("estoque_minimo")}
                defaultValue={valores?.estoque_minimo ?? "10"}
                inputMode="numeric"
                required
              />
            </Campo>

            {modo === "novo" ? (
              <Campo
                id="estoque_inicial"
                rotulo="Estoque inicial"
                erro={erros.estoque_inicial}
                ajuda="Registrado como uma entrada no histórico."
              >
                <Input {...propsCampo("estoque_inicial")} defaultValue="0" inputMode="numeric" required />
              </Campo>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" asChild>
            <Link href="/produtos">Voltar</Link>
          </Button>
          <Button type="submit" className="flex-1" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" /> : null}
            {modo === "novo" ? "Cadastrar" : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * O Select do Radix não aceita valor vazio, então "sem categoria" usa um valor
 * próprio e um campo oculto envia "" para o servidor.
 */
function SeletorCategoria({
  categorias,
  valorInicial,
}: {
  categorias: Categoria[];
  valorInicial: string;
}) {
  const [valor, setValor] = useState(valorInicial);

  return (
    <>
      <Select
        value={valor || SEM_CATEGORIA}
        onValueChange={(v) => setValor(v === SEM_CATEGORIA ? "" : v)}
      >
        <SelectTrigger id="categoria_id" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
          {categorias.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name="categoria_id" value={valor} />
    </>
  );
}
