/**
 * JavaScript para el plugin Condo360 Comunicados
 */

jQuery(document).ready(function($) {
    'use strict';
    
    // Variables globales
    const form = $('#condo360-comunicados-form');
    const submitBtn = $('.condo360-submit-btn');
    const responseDiv = $('#condo360-response');
    const fileInput = $('#condo360-file');
    
    // Configuración
    const config = {
        maxFileSize: parseInt(condo360_ajax.max_file_size) * 1024 * 1024, // Convertir a bytes
        allowedTypes: condo360_ajax.allowed_types.split(','),
        ajaxUrl: condo360_ajax.ajax_url,
        nonce: condo360_ajax.nonce,
        backendUrl: condo360_ajax.backend_url
    };
    
    // Inicializar eventos
    initEvents();
    
    function initEvents() {
        // Envío del formulario
        form.on('submit', handleFormSubmit);
        
        // Validación de archivo en tiempo real
        fileInput.on('change', validateFile);
        
        // Validación de campos en tiempo real
        $('#condo360-title').on('input', validateTitle);
        $('#condo360-description').on('input', validateDescription);
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validar formulario antes de enviar
        if (!validateForm()) {
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        hideResponse();
        
        // Preparar datos del formulario
        const formData = new FormData();
        formData.append('action', 'condo360_upload_communique');
        formData.append('nonce', config.nonce);
        formData.append('title', $('#condo360-title').val());
        formData.append('description', $('#condo360-description').val());
        formData.append('wp_user_id', $('input[name="wp_user_id"]').val());
        formData.append('user_display_name', $('input[name="user_display_name"]').val());
        formData.append('file', fileInput[0].files[0]);
        
        // Enviar datos
        $.ajax({
            url: config.ajaxUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            timeout: 300000, // 5 minutos
            success: function(response) {
                handleSuccess(response);
            },
            error: function(xhr, status, error) {
                handleError(xhr, status, error);
            },
            complete: function() {
                setLoadingState(false);
            }
        });
    }
    
    function validateForm() {
        let isValid = true;
        
        // Validar título
        if (!validateTitle()) {
            isValid = false;
        }
        
        // Validar archivo
        if (!validateFile()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateTitle() {
        const titleInput = $('#condo360-title');
        const title = titleInput.val().trim();
        
        if (title.length === 0) {
            showFieldError(titleInput, 'El título es obligatorio');
            return false;
        } else if (title.length > 255) {
            showFieldError(titleInput, 'El título es demasiado largo (máximo 255 caracteres)');
            return false;
        } else {
            clearFieldError(titleInput);
            return true;
        }
    }
    
    function validateDescription() {
        const descInput = $('#condo360-description');
        const description = descInput.val().trim();
        
        if (description.length > 1000) {
            showFieldError(descInput, 'La descripción es demasiado larga (máximo 1000 caracteres)');
            return false;
        } else {
            clearFieldError(descInput);
            return true;
        }
    }
    
    function validateFile() {
        const file = fileInput[0].files[0];
        
        if (!file) {
            showFieldError(fileInput, 'Debe seleccionar un archivo');
            return false;
        }
        
        // Validar tamaño
        if (file.size > config.maxFileSize) {
            const maxSizeMB = Math.round(config.maxFileSize / 1024 / 1024);
            showFieldError(fileInput, `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`);
            return false;
        }
        
        // Validar tipo
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!config.allowedTypes.includes(fileExtension)) {
            showFieldError(fileInput, `Tipo de archivo no permitido. Solo se aceptan: ${config.allowedTypes.join(', ')}`);
            return false;
        }
        
        // Validar nombre
        if (file.name.length > 255) {
            showFieldError(fileInput, 'El nombre del archivo es demasiado largo');
            return false;
        }
        
        clearFieldError(fileInput);
        return true;
    }
    
    function showFieldError(field, message) {
        clearFieldError(field);
        field.addClass('error');
        field.after(`<div class="field-error">${message}</div>`);
    }
    
    function clearFieldError(field) {
        field.removeClass('error');
        field.siblings('.field-error').remove();
    }
    
    function setLoadingState(loading) {
        if (loading) {
            submitBtn.addClass('loading').prop('disabled', true);
            form.find('input, textarea, button').prop('disabled', true);
        } else {
            submitBtn.removeClass('loading').prop('disabled', false);
            form.find('input, textarea, button').prop('disabled', false);
        }
    }
    
    function handleSuccess(response) {
        if (response.success) {
            const data = response.data;
            showSuccessResponse(data);
            resetForm();
        } else {
            showErrorResponse(response.data || 'Error desconocido');
        }
    }
    
    function handleError(xhr, status, error) {
        let errorMessage = 'Error al procesar la solicitud';
        
        if (status === 'timeout') {
            errorMessage = 'La solicitud tardó demasiado tiempo. Intente con un archivo más pequeño.';
        } else if (xhr.responseJSON && xhr.responseJSON.data) {
            errorMessage = xhr.responseJSON.data;
        } else if (xhr.status === 413) {
            errorMessage = 'El archivo es demasiado grande para ser procesado.';
        } else if (xhr.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
        }
        
        showErrorResponse(errorMessage);
    }
    
    function showSuccessResponse(data) {
        const html = `
            <div class="condo360-success-details">
                <h4>✅ Comunicado enviado exitosamente</h4>
                <p><strong>Título:</strong> ${data.title || 'N/A'}</p>
                <p><strong>Tipo de archivo:</strong> ${data.file_type || 'N/A'}</p>
                <p><strong>Notificaciones enviadas:</strong> ${data.notifications_sent || 0}</p>
                ${data.notifications_failed > 0 ? `<p><strong>Notificaciones fallidas:</strong> ${data.notifications_failed}</p>` : ''}
                ${data.wp_post_url ? `<p><strong>Ver comunicado:</strong> <a href="${data.wp_post_url}" target="_blank">${data.wp_post_url}</a></p>` : ''}
                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</p>
            </div>
        `;
        
        responseDiv.removeClass('error').addClass('success').html(html).show().addClass('condo360-fade-in');
        
        // Scroll hacia la respuesta
        $('html, body').animate({
            scrollTop: responseDiv.offset().top - 100
        }, 500);
    }
    
    function showErrorResponse(message) {
        const html = `
            <div class="condo360-error-details">
                <h4>❌ Error al enviar comunicado</h4>
                <p>${message}</p>
                <p>Por favor, verifique los datos e intente nuevamente.</p>
            </div>
        `;
        
        responseDiv.removeClass('success').addClass('error').html(html).show().addClass('condo360-fade-in');
        
        // Scroll hacia la respuesta
        $('html, body').animate({
            scrollTop: responseDiv.offset().top - 100
        }, 500);
    }
    
    function hideResponse() {
        responseDiv.hide().removeClass('condo360-fade-in');
    }
    
    function resetForm() {
        form[0].reset();
        hideResponse();
        form.find('.field-error').remove();
        form.find('input, textarea').removeClass('error');
    }
    
    // Utilidades adicionales
    
    // Mostrar información del archivo seleccionado
    fileInput.on('change', function() {
        const file = this.files[0];
        if (file) {
            const fileInfo = $('.condo360-file-info');
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            fileInfo.html(`Archivo seleccionado: ${file.name} (${sizeMB} MB)`);
        }
    });
    
    // Contador de caracteres para descripción
    const descInput = $('#condo360-description');
    const charCounter = $('<div class="char-counter"></div>').insertAfter(descInput);
    
    descInput.on('input', function() {
        const length = $(this).val().length;
        const maxLength = 1000;
        charCounter.text(`${length}/${maxLength} caracteres`);
        
        if (length > maxLength * 0.9) {
            charCounter.addClass('warning');
        } else {
            charCounter.removeClass('warning');
        }
    });
    
    // Estilos adicionales para contador de caracteres
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .char-counter {
                font-size: 12px;
                color: #7f8c8d;
                text-align: right;
                margin-top: 5px;
            }
            .char-counter.warning {
                color: #e74c3c;
                font-weight: bold;
            }
            .field-error {
                color: #e74c3c;
                font-size: 14px;
                margin-top: 5px;
                font-weight: 500;
            }
            .condo360-input.error,
            .condo360-textarea.error,
            .condo360-file-input.error {
                border-color: #e74c3c;
                box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
            }
        `)
        .appendTo('head');
    
    // Prevenir envío accidental con Enter en campos de texto
    form.find('input[type="text"], textarea').on('keypress', function(e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            if (validateForm()) {
                form.submit();
            }
        }
    });
    
    // Confirmación antes de enviar
    form.on('submit', function(e) {
        const file = fileInput[0].files[0];
        if (file && file.size > 10 * 1024 * 1024) { // Archivos mayores a 10MB
            if (!confirm('El archivo es grande y puede tardar varios minutos en procesarse. ¿Desea continuar?')) {
                e.preventDefault();
                return false;
            }
        }
    });
});
