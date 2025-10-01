import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { supabase } from "~/lib/supabaseClient";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Download, Eye, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export function meta() {
  return [
    { title: "Respostas do Formulário - FormCraft" },
    { name: "description", content: "Visualize as respostas do seu formulário" },
  ];
}

interface ResponseItem {
  id: string;
  field_key: string;
  value_json: any;
  valid: boolean;
  confidence: number | null;
  created_at: string;
}

interface Response {
  id: string;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
  abandoned_at: string | null;
  response_items: ResponseItem[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  schema_json: any;
  created_at: string;
}

export default function FormResponses() {
  const { formId } = useParams();
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    abandoned: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (!formId) return;

    const fetchData = async () => {
      try {
        // Fetch form data
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('id, title, description, schema_json, created_at')
          .eq('id', formId)
          .single();

        if (formError) throw formError;
        setForm(formData);

        // Fetch responses with items
        const { data: responsesData, error: responsesError } = await supabase
          .from('responses')
          .select(`
            id,
            status,
            created_at,
            updated_at,
            abandoned_at,
            response_items (
              id,
              field_key,
              value_json,
              valid,
              confidence,
              created_at
            )
          `)
          .eq('form_id', formId)
          .order('created_at', { ascending: false });

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);

        // Calculate stats
        const total = responsesData?.length || 0;
        const submitted = responsesData?.filter(r => r.status === 'submitted').length || 0;
        const abandoned = responsesData?.filter(r => r.abandoned_at).length || 0;
        const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

        setStats({ total, submitted, abandoned, completionRate });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  const exportToCSV = () => {
    if (!form || !responses.length) return;

    const headers = ['ID', 'Status', 'Data de Criação', 'Data de Atualização', 'Abandonado'];
    
    // Add field headers from schema
    if (form.schema_json?.fields) {
      form.schema_json.fields.forEach((field: any) => {
        headers.push(field.label || field.key);
      });
    }

    const csvContent = [
      headers.join(','),
      ...responses.map(response => {
        const row = [
          response.id,
          response.status,
          new Date(response.created_at).toLocaleString('pt-BR'),
          new Date(response.updated_at).toLocaleString('pt-BR'),
          response.abandoned_at ? 'Sim' : 'Não'
        ];

        // Add field values
        if (form.schema_json?.fields) {
          form.schema_json.fields.forEach((field: any) => {
            const item = response.response_items.find(ri => ri.field_key === field.key);
            const value = item ? JSON.stringify(item.value_json) : '';
            row.push(`"${value}"`);
          });
        }

        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.title}_respostas.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Carregando respostas...</p>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Formulário não encontrado</h1>
          <p className="text-gray-600 mb-4">O formulário que você está procurando não existe ou não tem permissão para visualizá-lo.</p>
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{form.title}</h1>
          <p className="text-gray-600 mt-2">{form.description}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Respostas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enviadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Abandonadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.abandoned}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Respostas ({responses.length})</h2>
          <Button onClick={exportToCSV} disabled={!responses.length}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Responses List */}
        {responses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Nenhuma resposta ainda.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <Card key={response.id} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={response.status === 'submitted' ? 'default' : 'secondary'}>
                        {response.status === 'submitted' ? 'Enviada' : 'Rascunho'}
                      </Badge>
                      {response.abandoned_at && (
                        <Badge variant="destructive">Abandonada</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Criada em: {new Date(response.created_at).toLocaleString('pt-BR')}
                    </p>
                    {response.updated_at !== response.created_at && (
                      <p className="text-sm text-gray-600">
                        Atualizada em: {new Date(response.updated_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">ID: {response.id.slice(0, 8)}...</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  {form.schema_json?.fields?.map((field: any) => {
                    const item = response.response_items.find(ri => ri.field_key === field.key);
                    const value = item?.value_json;
                    
                    return (
                      <div key={field.key} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="font-medium text-gray-700">{field.label}:</span>
                        <span className="text-gray-900">
                          {value !== undefined && value !== null && value !== '' 
                            ? (Array.isArray(value) ? value.join(', ') : String(value))
                            : <span className="text-gray-400 italic">Não preenchido</span>
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
