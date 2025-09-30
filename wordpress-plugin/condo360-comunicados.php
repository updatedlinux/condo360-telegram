<?php
/**
 * Plugin Name: Condo360 Comunicados
 * Description: Plugin para que la Junta de Condominio pueda subir comunicados que se publiquen automáticamente en el blog y notifiquen por correo a todos los propietarios.
 * Version: 1.0.0
 * Author: Condo360
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Condo360Comunicados {
    
    private $backend_url;
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('junta_comunicados', array($this, 'render_shortcode'));
    }
    
    public function init() {
        // URL del backend desde opciones o valor por defecto
        $this->backend_url = get_option('condo360_backend_url', 'https://blogapi.bonaventurecclub.com');
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Condo360 Comunicados',
            'Comunicados',
            'manage_options',
            'condo360-comunicados',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        if (isset($_POST['submit'])) {
            update_option('condo360_backend_url', sanitize_url($_POST['backend_url']));
            echo '<div class="notice notice-success"><p>Configuración guardada correctamente.</p></div>';
        }
        
        $backend_url = get_option('condo360_backend_url', 'https://blogapi.bonaventurecclub.com');
        ?>
        <div class="wrap">
            <h1>Configuración de Comunicados</h1>
            <form method="post" action="">
                <table class="form-table">
                    <tr>
                        <th scope="row">URL del Backend</th>
                        <td>
                            <input type="url" name="backend_url" value="<?php echo esc_attr($backend_url); ?>" class="regular-text" required />
                            <p class="description">URL del backend Node.js que procesa los comunicados.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('jquery');
        wp_enqueue_style('condo360-comunicados', plugin_dir_url(__FILE__) . 'assets/css/comunicados.css', array(), '1.0.0');
        wp_enqueue_script('condo360-comunicados', plugin_dir_url(__FILE__) . 'assets/js/comunicados.js', array('jquery'), '1.0.0', true);
        
        // Pasar datos al JavaScript
        wp_localize_script('condo360-comunicados', 'condo360_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'backend_url' => $this->backend_url,
            'nonce' => wp_create_nonce('condo360_nonce')
        ));
    }
    
    public function render_shortcode($atts) {
        // Verificar permisos
        if (!current_user_can('administrator') && !current_user_can('junta')) {
            return '<div class="condo360-access-denied">Acceso denegado. Solo administradores pueden subir comunicados.</div>';
        }
        
        $current_user = wp_get_current_user();
        
        ob_start();
        ?>
        <div class="condo360-comunicados-container">
            <div class="condo360-header">
                <h2 class="condo360-title">Subir Comunicado</h2>
                <p class="condo360-description">Sube un comunicado para que se publique automáticamente en el blog y se notifique a todos los propietarios.</p>
            </div>
            
            <form id="condo360-form" class="condo360-form" enctype="multipart/form-data">
                <div class="condo360-form-group">
                    <label for="condo360-file" class="condo360-label">Archivo del Comunicado *</label>
                    <div class="condo360-file-input-wrapper">
                        <input type="file" id="condo360-file" name="file" accept=".docx,.pdf" required class="condo360-file-input">
                        <div class="condo360-file-info">
                            <span class="condo360-file-text">Seleccionar archivo (.docx o .pdf)</span>
                            <span class="condo360-file-size">Máximo 25 MB</span>
                        </div>
                    </div>
                    <div class="condo360-file-preview" id="condo360-file-preview"></div>
                </div>
                
                <div class="condo360-form-group">
                    <label for="condo360-title" class="condo360-label">Título del Comunicado *</label>
                    <input type="text" id="condo360-title" name="title" required class="condo360-input" placeholder="Ej: Reunión de Junta - Enero 2025">
                </div>
                
                <div class="condo360-form-group">
                    <label for="condo360-description" class="condo360-label">Descripción Corta *</label>
                    <textarea id="condo360-description" name="description" required class="condo360-textarea" rows="3" placeholder="Breve descripción del comunicado..."></textarea>
                </div>
                
                <div class="condo360-form-group">
                    <button type="submit" class="condo360-submit-btn" id="condo360-submit">
                        <span class="condo360-btn-text">Enviar Comunicado</span>
                        <span class="condo360-btn-loading" style="display: none;">
                            <span class="condo360-spinner"></span>
                            Procesando...
                        </span>
                    </button>
                </div>
            </form>
            
            <!-- Progress Bar -->
            <div class="condo360-progress-container" id="condo360-progress" style="display: none;">
                <div class="condo360-progress-bar">
                    <div class="condo360-progress-fill" id="condo360-progress-fill"></div>
                </div>
                <div class="condo360-progress-text" id="condo360-progress-text">Preparando archivo...</div>
            </div>
            
            <!-- Success Tooltip -->
            <div class="condo360-success-tooltip" id="condo360-success-tooltip" style="display: none;">
                <div class="condo360-tooltip-content">
                    <div class="condo360-tooltip-icon">✓</div>
                    <div class="condo360-tooltip-text">
                        <strong>¡Comunicado enviado exitosamente!</strong>
                        <p>✅ El comunicado se ha publicado en el blog.</p>
                        <div class="condo360-batch-info">
                            <strong>📧 Notificaciones vía correo:</strong>
                            <p>Se enviarán <strong>en lotes progresivamente</strong> a todos los propietarios.</p>
                            <p><em>Esto asegura una entrega confiable sin sobrecargar el servidor SMTP.</em></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Error Messages -->
            <div class="condo360-error" id="condo360-error" style="display: none;"></div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Datos del usuario actual
            window.condo360_user = {
                id: <?php echo $current_user->ID; ?>,
                display_name: '<?php echo esc_js($current_user->display_name); ?>'
            };
        });
        </script>
        <?php
        return ob_get_clean();
    }
}

// Inicializar el plugin
new Condo360Comunicados();
