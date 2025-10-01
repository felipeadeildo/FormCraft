import type { Route } from "./+types/home";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useState, useEffect } from "react";
import { generateSchema } from "~/lib/llm";
import { FormFactory, type FormSchema } from "~/components/form/FormFactory";
import { supabase } from "~/lib/supabaseClient";
import { toast } from "sonner";
import { Link } from "react-router";
import { Eye } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FormCraft - Crie e Responda Formulários com IA" },
    { name: "description", content: "Crie formulários inteligentes com linguagem natural e responda de forma conversacional" },
  ];
}

interface PublicForm {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function Home() {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [publicForms, setPublicForms] = useState<PublicForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [myForms, setMyForms] = useState<PublicForm[]>([]);
  const [loadingMyForms, setLoadingMyForms] = useState(false);

  useEffect(() => {
    fetchPublicForms();
    fetchMyForms();
  }, []);

  const fetchPublicForms = async () => {
    setLoadingForms(true);
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, description, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPublicForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error("Erro ao carregar formulários");
    } finally {
      setLoadingForms(false);
    }
  };

  const fetchMyForms = async () => {
    setLoadingMyForms(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingMyForms(false);
        return;
      }

      const { data, error } = await supabase
        .from('forms')
        .select('id, title, description, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMyForms(data || []);
    } catch (error) {
      console.error('Error fetching my forms:', error);
      toast.error("Erro ao carregar seus formulários");
    } finally {
      setLoadingMyForms(false);
    }
  };

  const onGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateSchema(desc);
      setSchema(res.schema);
      setFormTitle(res.schema.title);
    } catch (error) {
      toast.error("Erro ao gerar formulário");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSaveForm = async () => {
    if (!schema) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: formTitle || schema.title,
          description: schema.description,
          schema_json: schema,
          owner_id: user?.id,
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setFormId(data.id);
      toast.success("Formulário salvo com sucesso!");
      fetchMyForms(); // Refresh my forms list
    } catch (error) {
      toast.error("Erro ao salvar formulário");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const onFormSubmit = async (data: Record<string, any>) => {
    if (!formId) return;
    
    try {
      const { error } = await supabase
        .from('responses')
        .insert({
          form_id: formId,
          status: 'submitted'
        })
        .select()
        .single();

      if (error) throw error;

      // Save response items
      const responseItems = Object.entries(data).map(([key, value]) => ({
        response_id: formId,
        field_key: key,
        value_json: value,
        valid: true
      }));

      const { error: itemsError } = await supabase
        .from('response_items')
        .insert(responseItems);

      if (itemsError) throw itemsError;

      toast.success("Resposta enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar resposta");
      console.error(error);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Criar</TabsTrigger>
          <TabsTrigger value="respond">Responder</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Create New Form */}
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Criar Novo Formulário</h2>
              <div className="space-y-2">
                <Label htmlFor="description">Descreva seu formulário</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Quero um formulário de feedback para clientes com campos de nome, email, nota de 1 a 5, comentários e se recomendaria nosso serviço..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onGenerate} disabled={loading || !desc}>
                  {loading ? "Gerando..." : "Gerar formulário"}
                </Button>
                {schema && (
                  <Button 
                    variant="secondary" 
                    onClick={onSaveForm}
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar formulário"}
                  </Button>
                )}
              </div>
            </Card>

            {/* My Forms */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Meus Formulários</h2>
              {loadingMyForms ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-4">Carregando seus formulários...</p>
                </div>
              ) : myForms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Você ainda não criou nenhum formulário.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myForms.map((form) => (
                    <Card key={form.id} className="p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-lg mb-2">{form.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {form.description || "Sem descrição"}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {new Date(form.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex gap-2">
                          <Link to={`/form/${form.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                          </Link>
                          <Link to={`/responses/${form.id}`}>
                            <Button size="sm">
                              Respostas
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {schema && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do formulário</Label>
                    <Input
                      id="title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Título do formulário"
                    />
                  </div>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Preview do formulário:</h3>
                  <FormFactory 
                    schema={schema} 
                    onSubmit={onFormSubmit}
                    loading={saving}
                  />
                </div>

                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-2">Schema JSON:</h3>
                  <pre className="text-xs bg-gray-950 text-gray-100 p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="respond">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Formulários Disponíveis</h2>
              {loadingForms ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-4">Carregando formulários...</p>
                </div>
              ) : publicForms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nenhum formulário público disponível no momento.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {publicForms.map((form) => (
                    <Card key={form.id} className="p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-lg mb-2">{form.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {form.description || "Sem descrição"}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {new Date(form.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <Link to={`/form/${form.id}`}>
                          <Button size="sm">Responder</Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
