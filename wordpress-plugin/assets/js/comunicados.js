/* Condo360 Comunicados - JavaScript */
jQuery(document).ready(function($) {
    
    const form = $('#condo360-form');
    const fileInput = $('#condo360-file');
    const filePreview = $('#condo360-file-preview');
    const submitBtn = $('#condo360-submit');
    const progressContainer = $('#condo360-progress');
    const progressFill = $('#condo360-progress-fill');
    const progressText = $('#condo360-progress-text');
    const successTooltip = $('#condo360-success-tooltip');
    const errorDiv = $('#condo360-error');
    
    // Manejar selección de archivo
    fileInput.on('change', function() {
        const file = this.files[0];
        if (file) {
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            const fileName = file.name;
            
            filePreview.html(`
                <p class="condo360-file-preview-text">
                    <strong>Archivo seleccionado:</strong> ${fileName}<br>
                    <strong>Tamaño:</strong> ${fileSize} MB
                </p>
            `).addClass('show');
            
            // Validar tamaño
            if (file.size > 25 * 1024 * 1024) {
                showError('El archivo es demasiado grande. El tamaño máximo permitido es 25 MB.');
                submitBtn.prop('disabled', true);
            } else {
                hideError();
                submitBtn.prop('disabled', false);
            }
        } else {
            filePreview.removeClass('show');
            submitBtn.prop('disabled', false);
        }
    });
    
    // Manejar envío del formulario
    form.on('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData();
        const file = fileInput[0].files[0];
        
        if (!file) {
            showError('Por favor selecciona un archivo.');
            return;
        }
        
        // Validaciones
        if (!file.name.match(/\.(docx|pdf)$/i)) {
            showError('Solo se permiten archivos .docx y .pdf');
            return;
        }
        
        if (file.size > 25 * 1024 * 1024) {
            showError('El archivo es demasiado grande. El tamaño máximo permitido es 25 MB.');
            return;
        }
        
        const title = $('#condo360-title').val().trim();
        const description = $('#condo360-description').val().trim();
        
        if (!title || !description) {
            showError('Por favor completa todos los campos requeridos.');
            return;
        }
        
        // Preparar datos
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('wp_user_id', window.condo360_user.id);
        formData.append('user_display_name', window.condo360_user.display_name);
        
        // Mostrar progreso
        showProgress();
        hideError();
        submitBtn.prop('disabled', true);
        
        // Enviar al backend
        $.ajax({
            url: condo360_ajax.backend_url + '/communiques/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        const percentComplete = (evt.loaded / evt.total) * 100;
                        updateProgress(percentComplete, 'Subiendo archivo...');
                    }
                }, false);
                return xhr;
            },
            success: function(response) {
                updateProgress(100, 'Procesando comunicado...');
                
                setTimeout(function() {
                    hideProgress();
                    if (response.success) {
                        showSuccess(response.data);
                        form[0].reset();
                        filePreview.removeClass('show');
                    } else {
                        showError(response.error || 'Error al procesar el comunicado.');
                    }
                }, 1000);
            },
            error: function(xhr) {
                hideProgress();
                let errorMessage = 'Error al enviar el comunicado.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = xhr.responseJSON.error;
                } else if (xhr.status === 413) {
                    errorMessage = 'El archivo es demasiado grande.';
                } else if (xhr.status === 0) {
                    errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
                }
                
                showError(errorMessage);
            },
            complete: function() {
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // Funciones de UI
    function showProgress() {
        progressContainer.show();
        updateProgress(0, 'Preparando archivo...');
    }
    
    function updateProgress(percent, text) {
        progressFill.css('width', percent + '%');
        progressText.text(text);
    }
    
    function hideProgress() {
        progressContainer.hide();
    }
    
    function showSuccess(responseData) {
        // Crear overlay
        const overlay = $('<div class="condo360-overlay"></div>');
        $('body').append(overlay);
        
        // Mostrar tooltip con información de lotes
        successTooltip.show();
        
        // Auto-cerrar después de 8 segundos (más tiempo para leer la info)
        setTimeout(function() {
            hideSuccess();
        }, 8000);
    }
    
    function hideSuccess() {
        successTooltip.hide();
        $('.condo360-overlay').remove();
    }
    
    function showError(message) {
        errorDiv.html(message).show();
    }
    
    function hideError() {
        errorDiv.hide();
    }
    
    // Cerrar tooltip al hacer clic en el overlay
    $(document).on('click', '.condo360-overlay', function() {
        hideSuccess();
    });
    
    // Cerrar tooltip con ESC
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && successTooltip.is(':visible')) {
            hideSuccess();
        }
    });
    
    // Validación en tiempo real
    $('#condo360-title, #condo360-description').on('input', function() {
        const title = $('#condo360-title').val().trim();
        const description = $('#condo360-description').val().trim();
        
        if (title && description) {
            submitBtn.prop('disabled', false);
        } else {
            submitBtn.prop('disabled', true);
        }
    });
    
    // Inicializar estado del botón
    submitBtn.prop('disabled', true);
});
