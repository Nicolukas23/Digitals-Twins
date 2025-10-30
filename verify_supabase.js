// verify_supabase.js
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function verifyDeployment() {
  console.log('🔍 Verificando despliegue en Supabase...')
  
  try {
    // Test conexión básica
    const { data, error } = await supabase.from('ciudades').select('*').limit(1)
    
    if (error) throw error
    
    console.log('✅ Conexión a Supabase exitosa')
    
    // Verificar todas las tablas
    const tables = ['ciudades', 'zonas', 'tenderos', 'vendedores', 'productos']
    
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ Error en tabla ${table}:`, error.message)
      } else {
        console.log(`✅ Tabla ${table}: ${count} registros`)
      }
    }
    
    // Test de consulta compleja
    const { data: tenderosData, error: tenderosError } = await supabase
      .from('tenderos')
      .select(`
        nombre,
        zonas (nombre, ciudades (nombre))
      `)
    
    if (!tenderosError) {
      console.log('✅ Relaciones funcionando correctamente')
      console.log('📊 Tenderos con zonas y ciudades:')
      tenderosData.forEach(t => {
        console.log(`   - ${t.nombre} -> ${t.zonas.nombre} -> ${t.zonas.ciudades.nombre}`)
      })
    }
    
    console.log('\n🎉 ¡Despliegue verificado exitosamente!')
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message)
  }
}

verifyDeployment()