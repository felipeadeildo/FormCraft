import { supabase } from "./supabaseClient";

export async function generateSchema(description: string) {
  const { data, error } = await supabase.functions.invoke("generate-schema", {
    body: { description },
  });

  if (error) {
    throw new Error(`Failed to generate schema: ${error.message}`);
  }

  return data;
}

export async function nluMap(message: string, schemaJson: unknown, currentAnswers?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("nlu-map", {
    body: { 
      message, 
      schema_json: schemaJson, 
      current_answers: currentAnswers 
    },
  });

  if (error) {
    throw new Error(`Failed to map NLU: ${error.message}`);
  }

  return data;
}