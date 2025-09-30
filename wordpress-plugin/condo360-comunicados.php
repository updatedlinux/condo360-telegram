<?php
/**
 * Plugin Name: Condo360 Comunicados
 * Plugin URI: https://bonaventurecclub.com
 * Description: Sistema para que la Junta de Condominio pueda subir comunicados que se publiquen automáticamente en el blog y notifiquen por correo a todos los propietarios.
 * Version: 1.0.0
 * Author: Condo360
 * Author URI: https://bonaventurecclub.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: condo360-comunicados
 * Domain Path: /languages
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('CONDO360_COMUNICADOS_VERSION', '1.0.0');
define('CONDO360_COMUNICADOS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONDO360_COMUNICADOS_PLUGIN_PATH', plugin_dir_path(__FILE__));

/**
 * Clase principal del plugin
 */
class Condo360Comunicados {
    
    private $backend_url;
    private $options;
    
    public function __construct() {
        $this->backend_url = get_option('condo360_backend_url', 'https://blogapi.bonaventurecclub.com');
        $this->options = get_option('condo360_comunicados_options', array());
        
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_condo360_upload_communique', array($this, 'handle_upload_ajax'));
        add_action('wp_ajax_nopriv_condo360_upload_communique', array($this, 'handle_upload_ajax'));
        
        // Registrar shortcode
        add_shortcode('junta_comunicados', array($this, 'render_shortcode'));
        
        // Hook de activación
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Inicializar el plugin
     */
    public function init() {
        // Cargar traducciones si están disponibles
        load_plugin_textdomain('condo360-comunicados', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Agregar menú de administración
     */
    public function add_admin_menu() {
        add_options_page(
            'Configuración Comunicados Condo360',
            'Comunicados Condo360',
            'manage_options',
            'condo360-comunicados',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Inicializar configuración de administración
     */
    public function admin_init() {
        register_setting('condo360_comunicados_options', 'condo360_comunicados_options');
        
        add_settings_section(
            'condo360_general_section',
            'Configuración General',
            array($this, 'general_section_callback'),
            'condo360-comunicados'
        );
        
        add_settings_field(
            'backend_url',
            'URL del Backend',
            array($this, 'backend_url_callback'),
            'condo360-comunicados',
            'condo360_general_section'
        );
        
        add_settings_field(
            'max_file_size',
            'Tamaño máximo de archivo (MB)',
            array($this, 'max_file_size_callback'),
            'condo360-comunicados',
            'condo360_general_section'
        );
        
        add_settings_field(
            'allowed_file_types',
            'Tipos de archivo permitidos',
            array($this, 'allowed_file_types_callback'),
            'condo360-comunicados',
            'condo360_general_section'
        );
    }
    
    /**
     * Callback para sección general
     */
    public function general_section_callback() {
        echo '<p>Configuración general del sistema de comunicados.</p>';
    }
    
    /**
     * Callback para URL del backend
     */
    public function backend_url_callback() {
        $value = isset($this->options['backend_url']) ? $this->options['backend_url'] : 'https://blogapi.bonaventurecclub.com';
        echo '<input type="url" name="condo360_comunicados_options[backend_url]" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">URL del servidor backend donde se procesan los comunicados.</p>';
    }
    
    /**
     * Callback para tamaño máximo de archivo
     */
    public function max_file_size_callback() {
        $value = isset($this->options['max_file_size']) ? $this->options['max_file_size'] : '25';
        echo '<input type="number" name="condo360_comunicados_options[max_file_size]" value="' . esc_attr($value) . '" min="1" max="100" />';
        echo '<p class="description">Tamaño máximo de archivo en MB (recomendado: 25MB).</p>';
    }
    
    /**
     * Callback para tipos de archivo permitidos
     */
    public function allowed_file_types_callback() {
        $value = isset($this->options['allowed_file_types']) ? $this->options['allowed_file_types'] : 'docx,pdf';
        echo '<input type="text" name="condo360_comunicados_options[allowed_file_types]" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">Tipos de archivo permitidos separados por comas (ej: docx,pdf).</p>';
    }
    
    /**
     * Página de administración
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Configuración de Comunicados Condo360</h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('condo360_comunicados_options');
                do_settings_sections('condo360-comunicados');
                submit_button();
                ?>
            </form>
            
            <div class="card" style="margin-top: 20px;">
                <h2>Información del Sistema</h2>
                <table class="form-table">
                    <tr>
                        <th>Versión del Plugin</th>
                        <td><?php echo CONDO360_COMUNICADOS_VERSION; ?></td>
                    </tr>
                    <tr>
                        <th>URL del Backend</th>
                        <td><?php echo esc_html($this->backend_url); ?></td>
                    </tr>
                    <tr>
                        <th>Estado del Backend</th>
                        <td>
                            <?php
                            $backend_status = $this->check_backend_status();
                            if ($backend_status) {
                                echo '<span style="color: green;">✓ Conectado</span>';
                            } else {
                                echo '<span style="color: red;">✗ No conectado</span>';
                            }
                            ?>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <h2>Instrucciones de Uso</h2>
                <ol>
                    <li>Use el shortcode <code>[junta_comunicados]</code> en cualquier página o post.</li>
                    <li>Solo usuarios con rol de administrador pueden subir comunicados.</li>
                    <li>Los archivos deben ser .docx o .pdf con un tamaño máximo de 25MB.</li>
                    <li>Los comunicados se publican automáticamente en el blog.</li>
                    <li>Se envían notificaciones por correo a todos los propietarios.</li>
                </ol>
            </div>
        </div>
        <?php
    }
    
    /**
     * Verificar estado del backend
     */
    private function check_backend_status() {
        $response = wp_remote_get($this->backend_url . '/health', array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        return $status_code === 200;
    }
    
    /**
     * Cargar scripts y estilos
     */
    public function enqueue_scripts() {
        wp_enqueue_script('jquery');
        wp_enqueue_script(
            'condo360-comunicados',
            CONDO360_COMUNICADOS_PLUGIN_URL . 'assets/js/comunicados.js',
            array('jquery'),
            CONDO360_COMUNICADOS_VERSION,
            true
        );
        
        wp_enqueue_style(
            'condo360-comunicados',
            CONDO360_COMUNICADOS_PLUGIN_URL . 'assets/css/comunicados.css',
            array(),
            CONDO360_COMUNICADOS_VERSION
        );
        
        // Localizar script para AJAX
        wp_localize_script('condo360-comunicados', 'condo360_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('condo360_upload_nonce'),
            'backend_url' => $this->backend_url,
            'max_file_size' => isset($this->options['max_file_size']) ? $this->options['max_file_size'] : '25',
            'allowed_types' => isset($this->options['allowed_file_types']) ? $this->options['allowed_file_types'] : 'docx,pdf',
        ));
    }
    
    /**
     * Renderizar shortcode
     */
    public function render_shortcode($atts) {
        // Verificar permisos
        if (!current_user_can('administrator') && !current_user_can('junta')) {
            return '<div class="condo360-access-denied"><p>Acceso denegado. Solo los administradores pueden subir comunicados.</p></div>';
        }
        
        $current_user = wp_get_current_user();
        
        ob_start();
        ?>
        <div class="condo360-comunicados-container">
            <div class="condo360-comunicados-form-wrapper">
                <h2 class="condo360-form-title">Subir Comunicado de la Junta</h2>
                
                <form id="condo360-comunicados-form" class="condo360-form" enctype="multipart/form-data">
                    <div class="condo360-form-group">
                        <label for="condo360-title" class="condo360-label">Título del Comunicado *</label>
                        <input type="text" id="condo360-title" name="title" class="condo360-input" required>
                    </div>
                    
                    <div class="condo360-form-group">
                        <label for="condo360-description" class="condo360-label">Descripción Corta</label>
                        <textarea id="condo360-description" name="description" class="condo360-textarea" rows="3" placeholder="Descripción opcional del comunicado..."></textarea>
                    </div>
                    
                    <div class="condo360-form-group">
                        <label for="condo360-file" class="condo360-label">Archivo del Comunicado *</label>
                        <input type="file" id="condo360-file" name="file" class="condo360-file-input" accept=".docx,.pdf" required>
                        <p class="condo360-file-info">Tipos permitidos: .docx, .pdf | Tamaño máximo: 25MB</p>
                    </div>
                    
                    <input type="hidden" name="wp_user_id" value="<?php echo $current_user->ID; ?>">
                    <input type="hidden" name="user_display_name" value="<?php echo esc_attr($current_user->display_name); ?>">
                    
                    <div class="condo360-form-group">
                        <button type="submit" class="condo360-submit-btn">
                            <span class="btn-text">Enviar Comunicado</span>
                            <span class="btn-loading" style="display: none;">Enviando...</span>
                        </button>
                    </div>
                </form>
                
                <div id="condo360-response" class="condo360-response" style="display: none;"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Manejar subida de archivo via AJAX
     */
    public function handle_upload_ajax() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'condo360_upload_nonce')) {
            wp_die('Error de seguridad');
        }
        
        // Verificar permisos
        if (!current_user_can('administrator') && !current_user_can('junta')) {
            wp_send_json_error('Acceso denegado');
        }
        
        // Verificar que se subió un archivo
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error('No se ha subido ningún archivo válido');
        }
        
        $file = $_FILES['file'];
        $title = sanitize_text_field($_POST['title']);
        $description = sanitize_textarea_field($_POST['description']);
        $wp_user_id = intval($_POST['wp_user_id']);
        $user_display_name = sanitize_text_field($_POST['user_display_name']);
        
        // Validaciones
        if (empty($title)) {
            wp_send_json_error('El título es obligatorio');
        }
        
        if (empty($wp_user_id)) {
            wp_send_json_error('ID de usuario no válido');
        }
        
        // Validar tipo de archivo
        $allowed_types = array('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $file_type = wp_check_filetype($file['name']);
        
        if (!in_array($file['type'], $allowed_types) && !in_array($file_type['type'], $allowed_types)) {
            wp_send_json_error('Tipo de archivo no permitido. Solo se aceptan archivos .docx y .pdf');
        }
        
        // Validar tamaño
        $max_size = isset($this->options['max_file_size']) ? intval($this->options['max_file_size']) * 1024 * 1024 : 25 * 1024 * 1024;
        if ($file['size'] > $max_size) {
            wp_send_json_error('El archivo excede el tamaño máximo permitido');
        }
        
        // Preparar datos para enviar al backend
        $boundary = wp_generate_password(12, false);
        $delimiter = '-------------' . $boundary;
        
        $post_data = '';
        
        // Agregar campos del formulario
        $post_data .= '--' . $delimiter . "\r\n";
        $post_data .= 'Content-Disposition: form-data; name="title"' . "\r\n\r\n";
        $post_data .= $title . "\r\n";
        
        $post_data .= '--' . $delimiter . "\r\n";
        $post_data .= 'Content-Disposition: form-data; name="description"' . "\r\n\r\n";
        $post_data .= $description . "\r\n";
        
        $post_data .= '--' . $delimiter . "\r\n";
        $post_data .= 'Content-Disposition: form-data; name="wp_user_id"' . "\r\n\r\n";
        $post_data .= $wp_user_id . "\r\n";
        
        $post_data .= '--' . $delimiter . "\r\n";
        $post_data .= 'Content-Disposition: form-data; name="user_display_name"' . "\r\n\r\n";
        $post_data .= $user_display_name . "\r\n";
        
        // Agregar archivo
        $post_data .= '--' . $delimiter . "\r\n";
        $post_data .= 'Content-Disposition: form-data; name="file"; filename="' . $file['name'] . '"' . "\r\n";
        $post_data .= 'Content-Type: ' . $file['type'] . "\r\n\r\n";
        $post_data .= file_get_contents($file['tmp_name']) . "\r\n";
        
        $post_data .= '--' . $delimiter . '--' . "\r\n";
        
        // Enviar al backend
        $response = wp_remote_post($this->backend_url . '/communiques/upload', array(
            'headers' => array(
                'Content-Type' => 'multipart/form-data; boundary=' . $delimiter,
                'Content-Length' => strlen($post_data),
            ),
            'body' => $post_data,
            'timeout' => 300, // 5 minutos para procesar archivos grandes
            'sslverify' => false,
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error('Error al comunicarse con el servidor: ' . $response->get_error_message());
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $response_data = json_decode($response_body, true);
        
        if ($response_code === 200 && $response_data['success']) {
            wp_send_json_success($response_data);
        } else {
            $error_message = isset($response_data['error']) ? $response_data['error'] : 'Error desconocido';
            wp_send_json_error($error_message);
        }
    }
    
    /**
     * Activar plugin
     */
    public function activate() {
        // Crear opciones por defecto
        $default_options = array(
            'backend_url' => 'https://blogapi.bonaventurecclub.com',
            'max_file_size' => '25',
            'allowed_file_types' => 'docx,pdf',
        );
        
        add_option('condo360_comunicados_options', $default_options);
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Desactivar plugin
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Inicializar el plugin
new Condo360Comunicados();
