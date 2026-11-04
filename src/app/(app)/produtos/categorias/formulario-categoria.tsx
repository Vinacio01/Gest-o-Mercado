"use client";

import { startTransition as iniciarTransicao, useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResultadoAcao } from "@/hooks/use-resultado-acao";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/lib/estado-formulario";

import { criarCategoriaAcao } from "../actions";

type PropsNome = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  valorInicial?: string;
  rotuloBotao: string;
  /** Limpa o campo depois de salvar (criação) ou fecha o diálogo (edição). */
  aoConcluir?: () => void;
  limparAoConcluir?: boolean;
  idCampo: string;
};

/** Formulário de um campo só (nome da categoria), usado para criar e renomear. */
export function FormularioNomeCategoria({
  acao,
  valorInicial,
  rotuloBotao,
  aoConcluir,
  limparAoConcluir = false,
  idCampo,
}: PropsNome) {
  const [estado, enviar, pendente] = useActionState(acao, ESTADO_INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useResultadoAcao(estado, () => {
    if (limparAoConcluir) formulario.current?.reset();
    aoConcluir?.();
  });

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        iniciarTransicao(() => enviar(dados));
      }}
      className="space-y-4"
    >
      <Campo id={idCampo} rotulo="Nome" erro={estado.campos?.nome}>
        <Input
          id={idCampo}
          name="nome"
          defaultValue={valorInicial}
          maxLength={60}
          placeholder="Ex.: Mercearia"
          aria-invalid={estado.campos?.nome ? true : undefined}
          required
        />
      </Campo>
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? <Loader2 className="animate-spin" /> : null}
        {rotuloBotao}
      </Button>
    </form>
  );
}

export function FormularioNovaCategoria() {
  return (
    <FormularioNomeCategoria
      idCampo="nova-categoria"
      acao={criarCategoriaAcao}
      rotuloBotao="Criar categoria"
      limparAoConcluir
    />
  );
}
