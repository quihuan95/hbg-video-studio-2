# Đặc tả Electron Shorts Builder

## Yêu cầu triển khai

Xây dựng ứng dụng desktop Electron tự dựng video từ một tiêu đề và thư mục footage. Luồng chính là **nhập tài nguyên → phân tích footage bằng OpenAI → viết kịch bản → tạo voice bằng ElevenLabs → dựng timeline → xuất MP4**. Một nút **Tạo video** chạy toàn bộ luồng. Khi hoàn thành, người dùng có thể xem preview, sửa lời thoại hoặc đổi cảnh rồi xuất lại.

## Đầu vào và đầu ra

| Trường | Yêu cầu |
|---|---|
| Tiêu đề video | Bắt buộc. Định hướng nội dung, hook và lựa chọn cảnh |
| Thư mục footage | Bắt buộc. Đọc cả thư mục con, hỗ trợ MP4, MOV, WebM và ảnh JPG/PNG |
| Logo | Tùy chọn. Ưu tiên PNG trong suốt. Chỉnh vị trí, kích thước, lề và opacity |
| Intro và outro | Hai file tùy chọn. Hiển thị thời lượng thực và cho phép cắt |
| Thời lượng | Tổng thời lượng, tính cả intro/outro. Mặc định 45 giây |
| Tỉ lệ | Mặc định 9:16. Hỗ trợ 1:1 và 16:9 |
| Giọng đọc | Tiếng Việt mặc định. Người dùng chọn ElevenLabs voice ID, model và tốc độ nếu model hỗ trợ |
| Clip mẫu | Link YouTube dưới đây và trường chọn MP4 mẫu trên máy |
| Thư mục xuất | Người dùng chọn. Xuất MP4 H.264/AAC, kèm SRT và timeline JSON |

Kích thước mặc định tương ứng là 1080×1920, 1080×1080 và 1920×1080, 30 fps. Kiểm tra trước khi chạy rằng tổng thời lượng intro/outro còn chừa thời gian cho phần nội dung.

## 1. Nhập và phân tích toàn bộ footage

- Dùng FFprobe lấy duration, stream audio/video, kích thước, FPS, rotation và metadata cần thiết. Hiển thị số file hợp lệ, file lỗi và trạng thái phân tích từng file.
- Dùng FFmpeg phát hiện điểm cắt cảnh, trích frame ở đầu/giữa/cuối đoạn và lấy thêm frame theo khoảng đều khi shot quá dài. Mọi file hợp lệ đều được đưa qua pipeline, kể cả khi chỉ một phần footage được chọn để dựng. Chia clip dài thành batch và giữ timestamp theo clip nguồn.
- Gửi frame có timestamp vào OpenAI Responses API qua model hỗ trợ ảnh. Nếu audio nguồn có lời nói cần dùng, trích audio và gọi OpenAI transcription, sau đó ghép transcript với các shot theo timecode. Nếu model transcription chỉ trả text, giữ timestamp theo các đoạn audio đã cắt.
- Yêu cầu Structured Outputs và validate ở máy. Mỗi shot có `assetId`, `inMs`, `outMs`, mô tả, tag, chữ nhìn thấy, gợi ý vùng crop, mức tin cậy và ghi chú chất lượng. Cảnh thiếu ngữ cảnh phải được đánh dấu để kiểm tra. Tên người, sự kiện, địa điểm và số liệu chỉ dùng khi có bằng chứng hoặc được người dùng nhập.
- Cache theo fingerprint nội dung file, phiên bản pipeline, model và cấu hình sampling. Giới hạn batch và concurrency. Hiển thị số frame dự kiến trước khi gửi và cho phép chỉnh ngân sách phân tích. Nếu giới hạn buộc giảm độ dày lấy mẫu, vẫn phân tích mỗi file hợp lệ và hiện rõ mức lấy mẫu.

## 2. Học phong cách từ video tham chiếu

Link của kênh: [YouTube Shorts mẫu](https://www.youtube.com/shorts/CWzdm-EmzcU). Chưa xác minh được hình ảnh và nhịp dựng từ link trong lúc soạn đặc tả. Triển khai ô nhập bản MP4 mẫu từ máy, ưu tiên file gốc hoặc bản xuất từ kênh của người dùng.

- Phân tích MP4 mẫu bằng FFmpeg và OpenAI để tạo preset chỉnh sửa được. Đo nhịp cắt, vị trí đoạn mở, phân bố độ dài shot và số đoạn có transition. Dùng frame và transcript để mô tả dạng hook, cách đưa text, kiểu caption, bố cục logo, cách mở và kết.
- Lưu style profile có phiên bản và các trường `hook`, `shotDurationMs`, `captionStyle`, `logoPlacement`, `transitions`, `introOutroBehavior` và `audioMix`. Ghi confidence và cho người dùng xem, sửa, lưu preset cho các video tiếp theo.
- Khi mới có link, dùng link làm tham chiếu và hiển thị preset **Short cơ bản** để app vẫn chạy được. Preset này dùng hook sớm, hard cut, caption tương phản cao và đổi cảnh theo ý lời thoại. Chỉ gắn nhãn **Đã phân tích clip mẫu** sau khi phân tích thành công file mẫu. Dùng mẫu để lấy cách dựng, còn nội dung video mới lấy từ footage và tiêu đề.

## 3. Viết kịch bản theo tiêu đề

- Tính `bodyMs = targetMs - introMs - outroMs`. Chọn shot theo mức liên quan đến tiêu đề, chất lượng và độ đa dạng. Tiêu đề có thông tin vượt quá bằng chứng từ footage thì viết theo các ý có thể xác minh và gắn cờ phần cần người dùng kiểm tra.
- OpenAI nhận tiêu đề, ngân sách thời lượng, danh sách shot, transcript, ngôn ngữ và style profile. Trả JSON gồm `hook`, `narration`, `beats[]` và `reviewFlags[]`. Mỗi beat chứa `id`, câu voice, mục đích cảnh, shot ID đề xuất, text overlay tùy chọn và thời lượng dự kiến.
- Kịch bản tiếng Việt dùng câu nói tự nhiên, vào chủ đề sớm. Nhắm ngân sách lời thoại dựa trên tốc độ giọng đo từ những lần tạo trước, sau đó căn theo audio thực. Khi người dùng chỉnh lời, tạo lại voice và timeline từ kịch bản mới, dùng lại phân tích footage.

## 4. Tạo voice và phụ đề

- Gọi ElevenLabs `POST /v1/text-to-speech/{voice_id}/with-timestamps`. Lưu audio và dữ liệu alignment theo cấu hình giọng. Ưu tiên một lần đọc liền mạch cho toàn bộ phần thân, rồi ánh xạ các beat sang mốc audio qua alignment. Dùng timestamp trả về để tạo cue SRT và caption đồng bộ.
- Kiểm tra duration audio bằng FFprobe. Nếu voice dài hơn phần thân, rút gọn kịch bản rồi tạo voice lại với số lần thử hữu hạn. Nếu vẫn vượt, hiển thị chênh lệch và cho sửa lời hoặc thời lượng. Giữ nguyên câu cuối khi xuất.
- Nếu voice ngắn hơn, phân bổ khoảng nghỉ hoặc kéo phần hình đến hết thời lượng bằng cảnh phù hợp. Giảm âm footage dưới voice theo preset và giữ các đoạn âm hiện trường khi có chủ đích. Nếu alignment thiếu, xử lý bằng bước căn chỉnh bổ sung hoặc báo rõ phụ đề chỉ có mốc ước tính.

## 5. Lập timeline, preview và render

- Timeline dùng millisecond nguyên với `videoTracks`, `audioTracks`, `overlays` và `captions`. Mỗi đoạn video có `assetId`, `sourceInMs`, `sourceOutMs`, `timelineInMs`, `timelineOutMs` và crop. Thời gian caption và voice tính từ đầu timeline, gồm offset intro.
- Chọn các shot có nội dung khớp từng beat và đủ độ dài. Ràng buộc trim trong khoảng nguồn. Nếu không đủ, dùng shot liên quan còn lại, ảnh tĩnh có chuyển động nhẹ hoặc báo thiếu cảnh. Cắt theo cụm ý và theo style profile. Chỉnh crop thủ công được khi khung dọc che mặt, chữ hoặc đối tượng chính.
- Chuẩn hóa rotation, FPS, SAR và audio trước khi ghép. Tính phần chồng lấn của transition vào thời lượng. Áp logo, caption tiếng Việt và safe area bằng cùng một timeline cho preview lẫn bản xuất. Chuẩn bị font có đủ dấu tiếng Việt. Dùng FFmpeg tạo proxy preview và render MP4 chính thức.
- Render sang file tạm, kiểm tra với FFprobe rồi đổi tên sang file đích. Không ghi đè file có sẵn khi chưa được chọn. Hủy job phải dừng process FFmpeg và bảo toàn cache hợp lệ.

## Kiến trúc và xử lý lỗi

- **Electron + TypeScript + React.** Renderer hiển thị form, trạng thái, kịch bản và preview. Preload cung cấp IPC có kiểu và danh sách API cụ thể. Main quản lý dialog, quyền file, API keys và điều phối job. Dùng `contextIsolation: true`, `nodeIntegration: false`, sandbox và kiểm tra payload IPC.
- **FFmpeg / FFprobe.** Gọi qua process với mảng arguments và `shell: false`. Đóng gói binary theo nền tảng hoặc cho chọn đường dẫn, kiểm tra codec/filter cần dùng lúc khởi động. Hỗ trợ đường dẫn có dấu, khoảng trắng và ký tự Unicode.
- **Bí mật.** Lưu khóa qua Electron safeStorage khi backend hệ điều hành hỗ trợ bảo mật. Nếu không, giữ khóa trong phiên. Khóa chỉ dùng ở main và không xuất trong log, IPC response hoặc project. Giữ footage gốc trên máy. Chỉ gửi frame, đoạn audio cần phiên âm và text cần thiết tới nhà cung cấp tương ứng.
- **Job.** Checkpoint theo bước `import → analyze → script → voice → timeline → render`. Ghi trạng thái và artifact nguyên tử. Khi chạy lại, chỉ tính lại những bước bị ảnh hưởng bởi đầu vào đã thay đổi. Retry có backoff cho lỗi tạm thời, tôn trọng Retry-After và báo lỗi riêng cho key, quota, file và encoder. Khi chưa biết request tạo voice đã thành công hay chưa, báo tình trạng trước khi gửi lại để tránh tính phí lặp.
- **Đóng gói.** Ưu tiên Windows x64 và macOS arm64. Bàn giao README cài đặt, cấu hình API, quy trình build và cách xử lý lỗi FFmpeg.

## Tiêu chí nghiệm thu

1. Với một thư mục gồm video có tiếng, video không tiếng, clip dọc/ngang và file hỏng, app báo đúng từng file, phân tích mọi file hợp lệ và tạo index shot truy được về timestamp nguồn.
2. Với tiêu đề, logo, intro, outro và yêu cầu 45 giây ở tỉ lệ 9:16, app chạy một lượt ra MP4 1080×1920 có voice, logo, caption và intro/outro. Kiểm tra duration xuất nằm trong ±0,15 giây và các mốc timeline đều hợp lệ.
3. Đổi tiêu đề làm thay đổi kịch bản hoặc thứ tự shot theo nội dung yêu cầu, đồng thời dùng lại cache footage. Đổi giọng tạo lại voice và cập nhật timing. Đổi tỉ lệ cập nhật crop, bố cục và kích thước xuất.
4. Nhập MP4 mẫu tạo được preset có thông số đo và người dùng sửa được. Chạy với link chưa có MP4 dùng đúng nhãn preset cơ bản.
5. Kịch bản vượt thời lượng, thiếu shot, khóa sai, HTTP 429, hết dung lượng hoặc hủy giữa lúc render đều có trạng thái rõ ràng. Có thể tiếp tục từ checkpoint hợp lệ sau khi xử lý lỗi.

## Tài liệu tích hợp

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Speech to Text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [ElevenLabs Speech with Timing](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [FFmpeg Filters](https://ffmpeg.org/ffmpeg-filters.html)
