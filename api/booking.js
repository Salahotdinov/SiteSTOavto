import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer'; // Исправлено: теперь используется import вместо require

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

            if (error && error.code !== 'PGRST116') throw error; 

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
                // Защита от падения, если клиент прислал пустые данные
                if (!bookingData) {
                    return res.status(400).json({ success: false, message: 'Данные заявки (bookingData) отсутствуют' });
                }

                // Достаем актуальный email администратора напрямую из Supabase
                const { data } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'admin_email')
                    .single();

                const targetAdminEmail = data ? data.value : 'info@autodok.ru';

                // Конфигурация SMTP-транспорта для Gmail
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // true для порта 465
                    auth: {
                        user: 'irazijp@gmail.com', // Ваша рабочая почта-робот
                        pass: 'qnjl zila vmoi yzmi'    // Ваш 16-значный пароль приложения
                    }
                });

                // Текст оповещения
                const mailOptions = {
                    from: '"АвтоДок Робот" <irazijp@gmail.com>', // Исправлено: адрес совпадает с логином auth.user
                    to: targetAdminEmail, 
                    subject: `🚗 Новая заявка на СТО от клиента: ${bookingData.name || 'Без имени'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #0b2b40;">Новая онлайн-запись на обслуживание</h2>
                            <p><strong>Имя клиента:</strong> ${bookingData.name || '—'}</p>
                            <p><strong>Телефон:</strong> ${bookingData.phone || '—'}</p>
                            <p><strong>Email клиента:</strong> ${bookingData.email || '—'}</p>
                            <p><strong>Марка и модель авто:</strong> ${bookingData.carModel || '—'}</p>
                            <p><strong>Выбранная услуга:</strong> ${bookingData.service || '—'}</p>
                            <p><strong>Дата визита:</strong> ${bookingData.date || '—'}</p>
                            <p><strong>Время визита:</strong> ${bookingData.time || '—'}</p>
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
