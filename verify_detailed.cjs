const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mgvckmnfovfsphbepimj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmNrbW5mb3Zmc3BoYmVwaW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODc5NjQsImV4cCI6MjA3NTY2Mzk2NH0.5t-UJ1dDCWLwijRPKjnKSxDBJSnfJp09lFMCWJb6YGI'
);

async function verifyDetailed() {
  console.log('🔍 Verificación detallada de Supabase...\n');
  
  try {
    // 1. Verificar ciudades
    console.log('1. Verificando ciudades:');
    const { data: ciudades, error: errorCiudades } = await supabase
      .from('ciudades')
      .select('*');
    
    if (errorCiudades) {
      console.log('   ❌ Error:', errorCiudades.message);
    } else {
      console.log(`   ✅ ${ciudades.length} ciudades encontradas:`);
      ciudades.forEach(ciudad => {
        console.log(`      - ${ciudad.nombre} (${ciudad.codigo})`);
      });
    }

    // 2. Verificar zonas con ciudades
    console.log('\n2. Verificando zonas:');
    const { data: zonas, error: errorZonas } = await supabase
      .from('zonas')
      .select('*, ciudades(nombre)');
    
    if (errorZonas) {
      console.log('   ❌ Error:', errorZonas.message);
    } else {
      console.log(`   ✅ ${zonas.length} zonas encontradas:`);
      zonas.forEach(zona => {
        console.log(`      - ${zona.nombre} en ${zona.ciudades.nombre}`);
      });
    }

    // 3. Verificar tenderos
    console.log('\n3. Verificando tenderos:');
    const { data: tenderos, error: errorTenderos } = await supabase
      .from('tenderos')
      .select('*');
    
    if (errorTenderos) {
      console.log('   ❌ Error:', errorTenderos.message);
    } else {
      console.log(`   ✅ ${tenderos.length} tenderos encontrados:`);
      tenderos.forEach(tendero => {
        console.log(`      - ${tendero.nombre}`);
      });
    }

    // 4. Verificar productos
    console.log('\n4. Verificando productos:');
    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('*');
    
    if (errorProductos) {
      console.log('   ❌ Error:', errorProductos.message);
    } else {
      console.log(`   ✅ ${productos.length} productos encontrados:`);
      productos.forEach(producto => {
        console.log(`      - ${producto.nombre} ($${producto.precio_base})`);
      });
    }

    // 5. Verificar relaciones completas
    console.log('\n5. Verificando relaciones completas:');
    const { data: relaciones, error: errorRelaciones } = await supabase
      .from('tenderos')
      .select(`
        nombre,
        zonas (nombre, ciudades (nombre))
      `);
    
    if (errorRelaciones) {
      console.log('   ❌ Error en relaciones:', errorRelaciones.message);
    } else if (relaciones.length > 0) {
      console.log('   ✅ Relaciones funcionando:');
      relaciones.forEach(t => {
        console.log(`      - ${t.nombre} → ${t.zonas.nombre} → ${t.zonas.ciudades.nombre}`);
      });
    } else {
      console.log('   ⚠️  No hay datos para verificar relaciones');
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
  }
}

verifyDetailed();
