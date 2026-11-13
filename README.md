# HBG Shorts Studio

### Bản 0.1.1

Sửa tạo voice bị chặn bởi lỗi “Alignment khác văn bản đầu vào”: ưu tiên `alignment` của lời gốc thay vì `normalized_alignment`. Lưu toàn bộ phản hồi ElevenLabs trước khi căn timeline; bấm lại với cùng lời/voice/model sẽ dùng cache, kể cả sau khi lỗi hoặc khởi động lại. Bổ sung trình nghe audio và đưa thông báo lỗi vào vùng nhìn thấy. Audio do bản 0.1.0 tạo không có dữ liệu alignment đi kèm nên không thể tự khôi phục timing chính xác chỉ từ cache MP3.

Ứng dụng desktop Electron + React + TypeScript để lập kế hoạch và dựng YouTube Shorts theo phong cách The HBG Official.

## Chạy trên Windows x64

Yêu cầu Node.js 22.12 trở lên và kết nối mạng khi cài dependency.

```powershell
npm.cmd install
npm.cmd exec -- install-electron --no
npm.cmd run dev
```

Chạy bản production từ mã nguồn:

```powershell
npm.cmd run build
npm.cmd start
```

Đóng gói portable Windows: `npm.cmd run package`. Bản đầu đi kèm FFmpeg/FFprobe cho Windows x64; chưa đóng gói macOS. Binary FFmpeg có giấy phép riêng trong package `@ffmpeg-installer/win32-x64` cần được kiểm tra trước khi phân phối thương mại.

## Cách dùng

1. Nhập tiêu đề, loại nội dung, mục tiêu, đối tượng, CTA và thông tin đã duyệt.
2. Chọn thư mục footage. App quét thư mục con, đọc metadata và tạo thumbnail, hiển thị riêng file lỗi.
3. Mở Cài đặt, nhập OpenAI API key, model hỗ trợ ảnh và Structured Outputs, ElevenLabs API key, Voice ID và voice model.
4. Tab Footage → Phân tích AI. Bản đầu gửi 3 khung hình/video, 1 khung hình/ảnh; mọi file hợp lệ đều được phân tích. Đây là lấy mẫu sơ bộ, không phải phân tích tất cả shot.
5. Tab Kịch bản → Viết kịch bản. Kiểm tra thông tin, lời đọc, bản phụ đề và cảnh đề xuất. Sự kiện dùng voice Việt/phụ đề Anh; tour dùng cả hai bằng tiếng Việt.
6. Tạo voice. App đo audio thật, tự cân lời/nhịp đọc theo thời lượng nội dung rồi cập nhật alignment. Nếu alignment không khớp, audio và phản hồi được giữ trong cache; app không tự gửi lại cùng yêu cầu có phí.
7. Tab Timeline: đổi cảnh, thứ tự, điểm bắt đầu và thời lượng. Mỗi đoạn phải nằm trong footage nguồn. Tạo lại voice sau khi đổi lời hoặc thứ tự lời.
8. Tab Xuất video: xuất MP4 hoặc timeline JSON và SRT. Nếu chưa có voice khớp, kế hoạch được ghi `temporary`.

Outro được tự động ghép cuối video và tính trong tổng thời lượng mục tiêu. App đọc thời lượng thật, dành phần còn lại cho nội dung, giữ âm thanh gốc của outro (hoặc thêm audio im lặng nếu file không có tiếng). Outro giữ nguyên bố cục với viền trắng nếu khác tỉ lệ; phụ đề, thẻ chữ và logo phần nội dung không phủ lên outro. Voice có sẵn được tự cân lại khi đổi thời lượng; không cắt câu cuối. Giao diện tự lưu dự án cục bộ sau khi chỉnh sửa.

Voice được tự cân theo thời lượng nội dung (tổng thời lượng trừ outro, chừa 0,2 giây cuối). Chênh lệch nhỏ được chỉnh tempo giữ cao độ và scale lại timestamp phụ đề; nếu vượt khoảng tempo 0,8–1,2, app dùng OpenAI biên tập lại lời/caption cùng các ý và CTA, tối đa hai lần rồi tạo lại voice. Phản hồi AI/TTS được cache. Quá trình có thể dùng quota OpenAI/ElevenLabs khi cần sửa lời; không cắt mất câu cuối hoặc tự tăng thời lượng video. Các trường hợp lời không thể vừa với số cảnh/thời lượng sau số lần thử hữu hạn vẫn có thông báo rõ ràng.

Nhạc nền mặc định là bản instrumental tạo ngay trên máy, không dùng sample hay tải nhạc bên ngoài. Có thể nghe thử, tắt, chọn MP3/WAV/M4A/AAC/OGG/FLAC riêng và chỉnh âm lượng 0–50%. Nhạc nền được loop, fade ở đầu/cuối phần nội dung và sidechain ducking dưới voice; kết thúc trước outro. Nhạc trong outro giữ mức âm lượng gốc, không bị ducking hoặc chồng nhạc nền.

Nút **Tạo video** chạy liên tiếp phân tích → kịch bản → voice → hộp thoại xuất MP4. Các yêu cầu API sử dụng quota tài khoản của bạn. Có thể chạy từng bước để kiểm tra trước.

## Đã triển khai

- Giao diện tiếng Việt: dự án, thiết lập, footage, kịch bản, timeline, xuất video và playbook thương hiệu.
- Preset HBG 52 giây, ba tỉ lệ 9:16 / 1:1 / 16:9.
- Lưu/mở dự án cục bộ, metadata và thumbnail thật qua FFmpeg/FFprobe.
- OpenAI Responses API với Structured Outputs, validate kết quả bằng Zod; cache phân tích theo SHA-256 nội dung file, phiên bản sampling và model.
- ElevenLabs with-timestamps, ánh xạ beat bằng alignment; phụ đề dịch dùng mốc của câu voice tương ứng.
- Render hard cut, crop giữa khung, voice, logo, thẻ từ khóa và phụ đề ASS vào MP4 H.264/AAC, BT.709, 30fps. Preview nguồn và MP4 đã xuất; chưa có proxy preview bản dựng trước xuất.
- IPC giới hạn, sandbox, context isolation, không bật Node trong renderer. Chỉ tệp đã được chọn hoặc khôi phục từ dự án mới được đọc qua media protocol.
- API keys không đưa vào project hoặc renderer response; dùng safeStorage nếu được hỗ trợ, nếu không chỉ giữ trong phiên.
- Hủy FFmpeg và API request; lưu dự án sau mỗi bước thành công và từng file phân tích. Không tự retry yêu cầu voice có phí.

## Phạm vi còn lại so với đặc tả đầy đủ

- Phát hiện shot, sampling theo timestamp từng shot, transcription audio nguồn, cache theo hash nội dung.
- Phân tích MP4 tham chiếu và chỉnh/lưu style profile có version; hiện preset lấy từ tài liệu HBG.
- Intro tự động, blur-fill, collage, crop thủ công/theo chủ thể, transition.
- Tách văn bản TTS chỉnh phát âm, thử phát âm thương hiệu, chia cue dài tối đa hai dòng, chỉnh typography/logo/safe area.
- Job manifest/checkpoint chi tiết, retry/backoff và ngân sách phân tích có thể chỉnh.
- Render proxy, kiểm tra chính xác duration ±0,15s, kiểm thử toàn luồng với API thật và asset thương hiệu.
- Đóng gói, ký ứng dụng và kiểm thử macOS arm64.

## Dữ liệu và xử lý lỗi

Bản render hoàn chỉnh được giữ trong cache trước khi lưu ra thư mục đích. Nếu tên file đã tồn tại/đang phát trong preview, ứng dụng tự thêm hậu tố để giữ nguyên bản cũ. Nếu thư mục đích không ghi được, video vẫn xem được từ cache; dùng **Lưu bản sao** để chọn nơi khác, không cần dựng lại hoặc gọi API.

Dự án được ghi vào `projects.json`, cấu hình vào `settings.json` và audio/thumbnail vào `cache/` bên trong Electron `app.getPath('userData')` (Windows thường ở `%APPDATA%/hbg-shorts-studio`). Chỉ gửi frame và text cần thiết đến OpenAI, text lời đọc đến ElevenLabs; không gửi file footage gốc.

Nếu FFmpeg không chạy, kiểm tra `node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe` và `node_modules/@ffprobe-installer/win32-x64/ffprobe.exe`. Khi đóng gói, các binary được unpack ngoài ASAR. Không chỉnh chính sách bảo mật Windows để chạy ứng dụng; PowerShell có thể dùng `npm.cmd` thay vì `npm`.

## Kiểm tra

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:smoke
```

Smoke test chạy Electron với thư mục dữ liệu riêng trong `.local/`, sinh footage/audio tổng hợp, kiểm tra import, Unicode, file hỏng, lưu dự án, media protocol, xuất JSON/SRT và render MP4 thật. Không gọi API có phí. Chưa kiểm chứng kết quả OpenAI/ElevenLabs bằng khóa thật.

`npm audit` còn cảnh báo mức moderate trong chuỗi công cụ đóng gói Electron/macOS (dependency phát triển). Zod đã cập nhật bản vá. Bản Windows thử nghiệm chưa ký số.

Tham chiếu: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [OpenAI images](https://developers.openai.com/api/docs/guides/images-vision), [ElevenLabs timing](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps).
