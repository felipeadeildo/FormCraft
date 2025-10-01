import { useState, useEffect, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Progress } from "~/components/ui/progress";
import { supabase } from "~/lib/supabaseClient";

export interface FormField {
  key: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'date' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: Array<{ value: string; label: string }>;
  description?: string;
}

export interface FormSchema {
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    allowAnonymous: boolean;
    showProgress: boolean;
    submitText: string;
  };
}

interface FormFactoryProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, any>) => void;
  loading?: boolean;
  formId?: string;
  responseId?: string;
}

export function FormFactory({ schema, onSubmit, loading = false, formId, responseId }: FormFactoryProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track session and activity
  useEffect(() => {
    if (!formId || !responseId) return;

    const trackSession = async () => {
      try {
        // Create or update session
        const { data: session, error } = await supabase
          .from('sessions')
          .upsert({
            response_id: responseId,
            turns_json: [],
            last_active_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        setSessionId(session.id);
      } catch (error) {
        console.error('Error tracking session:', error);
      }
    };

    trackSession();

    // Track activity every 30 seconds
    const activityInterval = setInterval(() => {
      updateActivity();
    }, 30000);

    // Track inactivity (5 minutes)
    const trackInactivity = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      
      inactivityTimeoutRef.current = setTimeout(async () => {
        await markAbandoned();
      }, 5 * 60 * 1000); // 5 minutes
    };

    const updateActivity = async () => {
      if (!sessionId) return;
      
      lastActivityRef.current = Date.now();
      
      try {
        await supabase
          .from('sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Error updating activity:', error);
      }
      
      trackInactivity();
    };

    const markAbandoned = async () => {
      if (!responseId) return;
      
      try {
        await supabase
          .from('responses')
          .update({ abandoned_at: new Date().toISOString() })
          .eq('id', responseId);
      } catch (error) {
        console.error('Error marking as abandoned:', error);
      }
    };

    // Initial inactivity tracking
    trackInactivity();

    return () => {
      clearInterval(activityInterval);
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [formId, responseId, sessionId]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} é obrigatório`;
    }

    if (!value && !field.required) return null;

    const validation = field.validation;
    if (!validation) return null;

    if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
      return `${field.label} deve ter pelo menos ${validation.minLength} caracteres`;
    }

    if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
      return `${field.label} deve ter no máximo ${validation.maxLength} caracteres`;
    }

    if (validation.min && typeof value === 'number' && value < validation.min) {
      return `${field.label} deve ser pelo menos ${validation.min}`;
    }

    if (validation.max && typeof value === 'number' && value > validation.max) {
      return `${field.label} deve ser no máximo ${validation.max}`;
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} tem formato inválido`;
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    // Validate all fields
    schema.fields.forEach(field => {
      const error = validateField(field, formData[field.key]);
      if (error) {
        newErrors[field.key] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    if (!hasErrors) {
      onSubmit(formData);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    const baseProps = {
      id: field.key,
      value: value,
      onChange: (e: any) => handleFieldChange(field.key, e.target?.value || e),
      placeholder: field.placeholder,
      className: error ? "border-red-500" : "",
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <Input
            {...baseProps}
            type={field.type}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            {...baseProps}
            type="number"
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            {...baseProps}
            type="date"
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            required={field.required}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.key, val)}>
            <SelectTrigger className={error ? "border-red-500" : ""}>
              <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.key}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field.key, [...selectedValues, option.value]);
                    } else {
                      handleFieldChange(field.key, selectedValues.filter(v => v !== option.value));
                    }
                  }}
                />
                <Label htmlFor={`${field.key}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.key}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
            />
            <Label htmlFor={field.key}>{field.label}</Label>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleFieldChange(field.key, val)}
            className={error ? "border-red-500" : ""}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.key}-${option.value}`} />
                <Label htmlFor={`${field.key}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return <Input {...baseProps} />;
    }
  };

  const progress = schema.fields.length > 0 
    ? (Object.keys(formData).filter(key => formData[key] !== '' && formData[key] !== null && formData[key] !== undefined).length / schema.fields.length) * 100
    : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{schema.title}</h1>
          {schema.description && (
            <p className="text-gray-600">{schema.description}</p>
          )}
        </div>

        {schema.settings.showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="space-y-4">
          {schema.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">{field.description}</p>
              )}
              {renderField(field)}
              {errors[field.key] && (
                <p className="text-sm text-red-500">{errors[field.key]}</p>
              )}
            </div>
          ))}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
        >
          {loading ? "Enviando..." : schema.settings.submitText}
        </Button>
      </form>
    </Card>
  );
}
