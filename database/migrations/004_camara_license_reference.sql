update articles
set cover_image_license = 'Creative Commons BY',
    cover_image_license_url = 'https://www.camara.leg.br/banco-imagens',
    updated_at = now()
where cover_image_source = 'camara_banco_imagens';
