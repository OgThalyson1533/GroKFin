/**
 * supabase/functions/config/index.ts
 * 
 * Edge Function que retorna credenciais do Supabase de forma segura
 * 
 * Nunca expõe o SERVICE_ROLE_KEY no cliente
 * Retorna apenas URL e ANON_KEY necessárias para o app
 * 
 * Deploy com:
 *   supabase functions deploy config
 * 
 * Chama com:
 *   GET /functions/v1/config
 */

export default async (req: Request) => {
  // CORS: permitir requisições do app
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    // Recupera URL e ANON_KEY das variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Validação: ambas as credenciais devem estar configuradas
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: 'Credenciais do Supabase não configuradas no servidor',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Retorna credenciais publicamente
    // (ANON_KEY é pública por design do Supabase)
    return new Response(
      JSON.stringify({
        url: supabaseUrl,
        key: supabaseAnonKey,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        },
      }
    );
  } catch (error) {
    console.error('[Config] Erro ao recuperar credenciais:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro ao recuperar configuração',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
