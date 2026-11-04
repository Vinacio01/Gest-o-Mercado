
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alertas_estoque": {
                  Row: {
                    "created_at": string,"enviado_em": string | null,"estoque_minimo_no_alerta": number,"id": string,"processando_desde": string | null,"produto_id": string,"quantidade_no_alerta": number,"resolvido_em": string | null,"status": Database["public"]['Enums']["status_alerta"],"tentativas": number,"ultimo_erro": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enviado_em"?: string | null,"estoque_minimo_no_alerta": number,"id"?: string,"processando_desde"?: string | null,"produto_id": string,"quantidade_no_alerta": number,"resolvido_em"?: string | null,"status"?: Database["public"]['Enums']["status_alerta"],"tentativas"?: number,"ultimo_erro"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"enviado_em"?: string | null,"estoque_minimo_no_alerta"?: number,"id"?: string,"processando_desde"?: string | null,"produto_id"?: string,"quantidade_no_alerta"?: number,"resolvido_em"?: string | null,"status"?: Database["public"]['Enums']["status_alerta"],"tentativas"?: number,"ultimo_erro"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alertas_estoque_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alertas_estoque_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_catalogo"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias": {
                  Row: {
                    "ativo": boolean,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"id"?: string,"nome": string
                  }
                  Update: {
                    "ativo"?: boolean,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"configuracoes": {
                  Row: {
                    "alertas_ativos": boolean,"email_alerta": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alertas_ativos"?: boolean,"email_alerta"?: string | null,"id"?: number
                  }
                  Update: {
                    "alertas_ativos"?: boolean,"email_alerta"?: string | null,"id"?: number
                  }
                  Relationships: [
                    
                  ]
                },"itens_venda": {
                  Row: {
                    "custo_unitario": number,"id": string,"preco_unitario": number,"produto_id": string,"quantidade": number,"subtotal": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "custo_unitario": number,"id"?: string,"preco_unitario": number,"produto_id": string,"quantidade": number,"subtotal": number,"venda_id": string
                  }
                  Update: {
                    "custo_unitario"?: number,"id"?: string,"preco_unitario"?: number,"produto_id"?: string,"quantidade"?: number,"subtotal"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "itens_venda_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_venda_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_catalogo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "itens_venda_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"movimentacoes_estoque": {
                  Row: {
                    "created_at": string,"id": string,"motivo": string | null,"produto_id": string,"quantidade": number,"quantidade_anterior": number,"quantidade_posterior": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"usuario_id": string,"venda_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"motivo"?: string | null,"produto_id": string,"quantidade": number,"quantidade_anterior": number,"quantidade_posterior": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"usuario_id": string,"venda_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"motivo"?: string | null,"produto_id"?: string,"quantidade"?: number,"quantidade_anterior"?: number,"quantidade_posterior"?: number,"tipo"?: Database["public"]['Enums']["tipo_movimentacao"],"usuario_id"?: string,"venda_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos_catalogo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_estoque_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Update: {
                    "ativo"?: boolean,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"produtos": {
                  Row: {
                    "ativo": boolean,"busca": string | null,"categoria_id": string | null,"codigo_barras": string | null,"created_at": string,"descricao": string | null,"estoque_baixo": boolean | null,"estoque_minimo": number,"id": string,"nome": string,"preco_custo": number,"preco_venda": number,"quantidade": number,"unidade": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"busca"?: never,"categoria_id"?: string | null,"codigo_barras"?: string | null,"created_at"?: string,"descricao"?: string | null,"estoque_baixo"?: never,"estoque_minimo"?: number,"id"?: string,"nome": string,"preco_custo"?: number,"preco_venda": number,"quantidade"?: number,"unidade"?: string,"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"busca"?: never,"categoria_id"?: string | null,"codigo_barras"?: string | null,"created_at"?: string,"descricao"?: string | null,"estoque_baixo"?: never,"estoque_minimo"?: number,"id"?: string,"nome"?: string,"preco_custo"?: number,"preco_venda"?: number,"quantidade"?: number,"unidade"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produtos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"vendas": {
                  Row: {
                    "cancelada_em": string | null,"cancelada_por": string | null,"chave_idempotencia": string,"created_at": string,"custo_total": number,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"id": string,"motivo_cancelamento": string | null,"operador_id": string,"status": Database["public"]['Enums']["status_venda"],"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelada_em"?: string | null,"cancelada_por"?: string | null,"chave_idempotencia": string,"created_at"?: string,"custo_total": number,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"id"?: string,"motivo_cancelamento"?: string | null,"operador_id": string,"status"?: Database["public"]['Enums']["status_venda"],"total": number
                  }
                  Update: {
                    "cancelada_em"?: string | null,"cancelada_por"?: string | null,"chave_idempotencia"?: string,"created_at"?: string,"custo_total"?: number,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"],"id"?: string,"motivo_cancelamento"?: string | null,"operador_id"?: string,"status"?: Database["public"]['Enums']["status_venda"],"total"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "produtos_catalogo": {
                  Row: {
                    "ativo": boolean,"busca": string | null,"categoria_id": string | null,"categoria_nome": string | null,"codigo_barras": string | null,"descricao": string | null,"estoque_baixo": boolean | null,"estoque_minimo": number,"id": string,"nome": string,"preco_venda": number,"quantidade": number,"unidade": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "produtos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "aplicar_movimentacao":
{ Args: { "p_motivo"?: string,"p_produto_id": string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_venda_id"?: string }; Returns: {
              "created_at": string,
"id": string,
"motivo": string | null,
"produto_id": string,
"quantidade": number,
"quantidade_anterior": number,
"quantidade_posterior": number,
"tipo": Database["public"]['Enums']["tipo_movimentacao"],
"usuario_id": string,
"venda_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "movimentacoes_estoque"
        isOneToOne: true
        isSetofReturn: false
      } },
"cadastrar_produto":
{ Args: { "p_categoria_id"?: string,"p_codigo_barras"?: string,"p_descricao"?: string,"p_estoque_inicial"?: number,"p_estoque_minimo"?: number,"p_nome": string,"p_preco_custo"?: number,"p_preco_venda": number,"p_unidade"?: string }; Returns: string
                           },
"eh_proprietario":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"eh_usuario_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"exigir_proprietario":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"faturamento_por_dia":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "dia": string,"faturamento": number,"quantidade_vendas": number
            }[]
                           },
"faturamento_por_mes":
{ Args: { "p_meses"?: number,"p_referencia": string }; Returns: {
              "faturamento": number,"mes": string,"quantidade_vendas": number
            }[]
                           },
"registrar_ajuste":
{ Args: { "p_motivo": string,"p_nova_quantidade": number,"p_produto_id": string }; Returns: string
                           },
"registrar_entrada":
{ Args: { "p_motivo"?: string,"p_produto_id": string,"p_quantidade": number }; Returns: string
                           },
"registrar_saida_manual":
{ Args: { "p_motivo": string,"p_produto_id": string,"p_quantidade": number }; Returns: string
                           },
"registrar_venda":
{ Args: { "p_chave_idempotencia": string,"p_forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"p_itens": Json }; Returns: Json
                           },
"reservar_alertas_para_envio":
{ Args: { "p_ids"?: (string)[],"p_limite_tentativas"?: number }; Returns: {
              "alerta_id": string,"produto_estoque_minimo": number,"produto_nome": string,"produto_quantidade": number,"produto_unidade": string,"tentativas_anteriores": number
            }[]
                           },
"resumo_vendas":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "custo": number,"faturamento": number,"lucro_bruto": number,"quantidade_vendas": number,"ticket_medio": number
            }[]
                           },
"texto_busca":
{ Args: { "texto": string }; Returns: string
                           },
"top_produtos":
{ Args: { "p_fim": string,"p_inicio": string,"p_limite"?: number }; Returns: {
              "faturamento": number,"nome": string,"produto_id": string,"quantidade": number,"unidade": string
            }[]
                           },
"vendas_por_forma":
{ Args: { "p_fim": string,"p_inicio": string }; Returns: {
              "faturamento": number,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"],"quantidade_vendas": number
            }[]
                           }
          }
          Enums: {
            "forma_pagamento": "dinheiro"|"pix"|"debito"|"credito","papel_usuario": "proprietario"|"funcionario","status_alerta": "pendente"|"enviado"|"falhou","status_venda": "concluida"|"cancelada","tipo_movimentacao": "entrada"|"saida_manual"|"venda"|"cancelamento_venda"|"ajuste"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "forma_pagamento": ["dinheiro", "pix", "debito", "credito"],"papel_usuario": ["proprietario", "funcionario"],"status_alerta": ["pendente", "enviado", "falhou"],"status_venda": ["concluida", "cancelada"],"tipo_movimentacao": ["entrada", "saida_manual", "venda", "cancelamento_venda", "ajuste"]
          }
        }
} as const
