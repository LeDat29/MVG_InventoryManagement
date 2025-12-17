/**
 * Xóa Sample Data trong Projects
 * Script để xóa các dự án mẫu trong database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'kho_mvg',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function deleteSampleProjects() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔍 Đang tìm kiếm sample projects...');
    
    // Tìm các projects có thể là sample data
    // Có thể xác định bằng tên, code, hoặc description chứa từ khóa "sample", "test", "demo", "mẫu"
    const [sampleProjects] = await connection.query(`
      SELECT id, name, code, description, created_at 
      FROM projects 
      WHERE (
        LOWER(name) LIKE '%sample%' 
        OR LOWER(name) LIKE '%test%' 
        OR LOWER(name) LIKE '%demo%'
        OR LOWER(name) LIKE '%mẫu%'
        OR LOWER(code) LIKE '%sample%'
        OR LOWER(code) LIKE '%test%'
        OR LOWER(code) LIKE '%demo%'
        OR LOWER(description) LIKE '%sample%'
        OR LOWER(description) LIKE '%test%'
        OR LOWER(description) LIKE '%demo%'
        OR LOWER(description) LIKE '%mẫu%'
      )
      AND is_active = TRUE
    `);

    if (sampleProjects.length === 0) {
      console.log('✅ Không tìm thấy sample projects nào để xóa.');
      return;
    }

    console.log(`📋 Tìm thấy ${sampleProjects.length} sample project(s):`);
    sampleProjects.forEach((project, index) => {
      console.log(`   ${index + 1}. ID: ${project.id}, Code: ${project.code}, Name: ${project.name}`);
    });

    // Xác nhận xóa
    console.log('\n⚠️  Bạn có chắc muốn xóa các projects này?');
    console.log('   (Trong production, hãy chạy với --confirm flag)');
    
    // Nếu có flag --confirm thì xóa luôn
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
      console.log('\n💡 Để xóa, chạy lại với: node scripts/delete-sample-projects.js --confirm');
      return;
    }

    console.log('\n🗑️  Đang xóa sample projects...');
    
    // Xóa các warehouse_zones liên quan trước (do foreign key)
    const projectIds = sampleProjects.map(p => p.id);
    const placeholders = projectIds.map(() => '?').join(',');
    
    await connection.query(`
      DELETE FROM warehouse_zones 
      WHERE project_id IN (${placeholders})
    `, projectIds);
    console.log(`   ✅ Đã xóa warehouse_zones liên quan`);

    // Xóa các contracts liên quan
    await connection.query(`
      DELETE FROM contracts 
      WHERE project_id IN (${placeholders})
    `, projectIds);
    console.log(`   ✅ Đã xóa contracts liên quan`);

    // Xóa các user_project_permissions liên quan
    await connection.query(`
      DELETE FROM user_project_permissions 
      WHERE project_id IN (${placeholders})
    `, projectIds);
    console.log(`   ✅ Đã xóa user_project_permissions liên quan`);

    // Xóa các project_tasks liên quan
    await connection.query(`
      DELETE FROM project_tasks 
      WHERE project_id IN (${placeholders})
    `, projectIds);
    console.log(`   ✅ Đã xóa project_tasks liên quan`);

    // Cuối cùng xóa projects
    await connection.query(`
      DELETE FROM projects 
      WHERE id IN (${placeholders})
    `, projectIds);
    
    console.log(`\n✅ Đã xóa thành công ${sampleProjects.length} sample project(s)!`);
    
  } catch (error) {
    console.error('❌ Lỗi khi xóa sample projects:', error.message);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Chạy script
deleteSampleProjects().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

