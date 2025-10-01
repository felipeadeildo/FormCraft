import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { supabase } from "~/lib/supabaseClient";
import { FormFactory, type FormSchema } from "~/components/form/FormFactory";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Responder Formulário - FormCraft" },
    { name: "description", content: "Responda ao formulário" },
  ];
}

export default function FormResponse() {
  const { id } = useParams();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchForm = async () => {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('title, description, schema_json')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (error) throw error;

        setFormTitle(data.title);
        setSchema(data.schema_json);
      } catch (error) {
        console.error('Error fetching form:', error);
        toast.error("Formulário não encontrado");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Create a draft response for tracking
    const createDraftResponse = async () => {
      try {
        const { data: response, error } = await supabase
          .from('responses')
          .insert({
            form_id: id,
            status: 'draft'
          })
          .select()
          .single();

        if (error) throw error;
        setResponseId(response.id);
      } catch (error) {
        console.error('Error creating draft response:', error);
      }
    };

    createDraftResponse();
  }, [id]);

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!id || !schema || !responseId) return;

    setSubmitting(true);
    try {
      // Update response to submitted
      const { error: responseError } = await supabase
        .from('responses')
        .update({ status: 'submitted' })
        .eq('id', responseId);

      if (responseError) throw responseError;

      // Save response items
      const responseItems = Object.entries(formData).map(([key, value]) => ({
        response_id: responseId,
        field_key: key,
        value_json: value,
        valid: true
      }));

      const { error: itemsError } = await supabase
        .from('response_items')
        .insert(responseItems);

      if (itemsError) throw itemsError;

      toast.success("Resposta enviada com sucesso!");
      
      // Reset form
      setSchema({ ...schema });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("Erro ao enviar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Carregando formulário...</p>
        </Card>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Formulário não encontrado</h1>
          <p className="text-gray-600 mb-4">O formulário que você está procurando não existe ou não está disponível.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{formTitle}</h1>
        </div>

        <FormFactory 
          schema={schema} 
          onSubmit={handleSubmit}
          loading={submitting}
          formId={id}
          responseId={responseId}
        />
      </div>
    </div>
  );
}
