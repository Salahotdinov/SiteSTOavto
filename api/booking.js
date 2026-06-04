import { createClient } from '@supabase/supabase-js';
const nodemailer = require('nodemailer');

// Инициализируем защищенный клиент Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
    // Настройки заголовков CORS для предотвращения ошибок блокировки браузером
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. МЕТОД GET: Загрузка текущего email администратора из Supabase в админку
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'admin_email')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 означает, что строка не найдена

            return res.status(200).json({ adminEmail: data ? data.value : 'info@autodok.ru' });
        } catch (error) {
            return res.status(500).json({ error: 'Ошибка базы данных Supabase: ' + error.message });
        }
    }

    // 2. МЕТОД POST: Обработка отправки форм и сохранения настроек
    if (req.method === 'POST') {
        const { action, emailValue, bookingData } = req.body;

        // А) Сохранение настроек почты (вызывается из панели администратора)
        if (action === 'saveSettings') {
            if (!emailValue || !emailValue.includes('@')) {
                return res.status(400).json({ success: false, message: 'Введен некорректный email' });
            }
            try {
                const { error } = await supabase
                    .from('settings')
                    .upsert({ key: 'admin_email', value: emailValue });

                if (error) throw error;
                return res.status(200).json({ success: true, message: 'Email успешно обновлен в Supabase!' });
            } catch (error) {
                return res.status(500).json({ success: false, message: 'Не удалось сохранить в БД: ' + error.message });
            }
        }

        // Б) Создание заявки онлайн-записи (вызывается со страницы клиента)
        if (action === 'createBooking') {
            try {
                // Достаем актуальный email администратора напрямую из Supabase
                const { data } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'admin_email')
                    .single();

                const targetAdminEmail = data ? data.value : 'info@autodok.ru';

                // ===============================================================
                // НАСТРОЙКА ВАШЕЙ ПОЧТЫ ДЛЯ ОТПРАВКИ (Замените данные на свои)
                // ===============================================================
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com', // Если Яндекс: smtp.yandex.ru, если Gmail: smtp.gmail.com
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'irazijp@gmail.com', // Email-робот, с которого будут уходить письма
                        pass: 'qnjl zila vmoi yzmi'    // Специальный пароль приложения (НЕ от аккаунта!)
                    }
                });

                // Текст оповещения
                const mailOptions = {
                    from: '"АвтоДок Робот" <YOUR_SYSTEM_EMAIL@gmail.ru>', 
                    to: targetAdminEmail, // Отправляем на email администратора из Supabase
                    subject: `🚗 Новая заявка на СТО от клиента: ${bookingData.name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #0b2b40;">Новая онлайн-запись на обслуживание</h2>
                            <p><strong>Имя клиента:</strong> ${bookingData.name}</p>
                            <p><strong>Телефон:</strong> ${bookingData.phone}</p>
                            <p><strong>Email клиента:</strong> ${bookingData.email}</p>
                            <p><strong>Марка и модель авто:</strong> ${bookingData.carModel}</p>
                            <p><strong>Выбранная услуга:</strong> ${bookingData.service}</p>
                            <p><strong>Дата визита:</strong> ${bookingData.date}</p>
                            <p><strong>Время визита:</strong> ${bookingData.time}</p>
                            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;">
                            <p style="font-size: 12px; color: #64748b;"><i>Сообщение сгенерировано автоматически. Конфигурация бэкенда: Vercel Serverless + Supabase PostgreSQL.</i></p>
                        </div>
                    `
                };

                // Отправляем письмо
                await transporter.sendMail(mailOptions);
                return res.status(200).json({ success: true, message: 'Заявка отправлена!' });

            } catch (error) {
                return res.status(500).json({ success: false, message: 'Ошибка отправки почты: ' + error.message });
            }
        }
    }

    return res.status(405).json({ message: 'Метод не поддерживается' });
}
