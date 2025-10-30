// verificar_historial_tendero.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mgvckmnfovfsphbepimj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndmNrbW5mb3Zmc3BoYmVwaW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODc5NjQsImV4cCI6MjA3NTY2Mzk2NH0.5t-UJ1dDCWLwijRPKjnKSxDBJSnfJp09lFMCWJb6YGI'
);

async function verificarHistorial() {
  console.log('🔍 Verificando historial de compras...\n');
  
  try {
    // 1. Obtener tenderos
    const { data: tenderos, error: errorTenderos } = await supabase
      .from('tenderos')
      .select('*');
    
    if (errorTenderos) throw errorTenderos;
    
    console.log('✅ Tenderos encontrados:');
    tenderos.forEach(tendero => {
      console.log(`   - ${tendero.nombre} (ID: ${tendero.id})`);
    });

    // 2. Obtener historial completo
    const { data: historial, error: errorHistorial } = await supabase
      .from('historial_compras')
      .select('*')
      .order('fecha_visita', { ascending: false });
    
    if (errorHistorial) throw errorHistorial;
    
    console.log('\n📊 Historial de compras completo:');
    const visitasAgrupadas = {};
    
    historial.forEach(venta => {
      if (!visitasAgrupadas[venta.visita_id]) {
        visitasAgrupadas[venta.visita_id] = {
          fecha: venta.fecha_visita,
          tendero: venta.tendero_nombre,
          vendedor: venta.vendedor_nombre,
          items: []
        };
      }
      visitasAgrupadas[venta.visita_id].items.push(venta);
    });

    Object.keys(visitasAgrupadas).forEach(visitaId => {
      const visita = visitasAgrupadas[visitaId];
      const totalVisita = visita.items.reduce((sum, item) => sum + parseFloat(item.total), 0);
      
      console.log(`\n   📅 Visita #${visitaId} - ${visita.fecha}`);
      console.log(`   Tendero: ${visita.tendero} | Vendedor: ${visita.vendedor}`);
      console.log(`   Total: $${totalVisita}`);
      
      visita.items.forEach(item => {
        console.log(`     - ${item.cantidad}x ${item.producto_nombre} - $${item.total}`);
      });
    });

    // 3. Probar función de historial por tendero
    console.log('\n👤 Historial del tendero 1:');
    const { data: historialTendero1, error: errorTendero1 } = await supabase
      .rpc('obtener_historial_tendero', { tendero_id_param: 1 });
    
    if (!errorTendero1 && historialTendero1) {
      historialTendero1.forEach(venta => {
        console.log(`   ${venta.fecha_visita} - ${venta.producto_nombre} - $${venta.total}`);
      });
    }

    // 4. Probar resumen de compras
    console.log('\n📈 Resumen de compras del tendero 1:');
    const { data: resumen, error: errorResumen } = await supabase
      .rpc('obtener_resumen_compras_tendero', { tendero_id_param: 1 });
    
    if (!errorResumen && resumen && resumen.length > 0) {
      console.log(`   Total compras: $${resumen[0].total_compras}`);
      console.log(`   Total visitas: ${resumen[0].total_visitas}`);
      console.log(`   Primera compra: ${resumen[0].primer_compra}`);
      console.log(`   Última compra: ${resumen[0].ultima_compra}`);
      console.log(`   Producto más comprado: ${resumen[0].producto_mas_comprado}`);
      console.log(`   Productos diferentes: ${resumen[0].total_productos_diferentes}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verificarHistorial();