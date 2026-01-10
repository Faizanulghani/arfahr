using System.Text.RegularExpressions;
using SourceAFIS;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// CORS
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["Access-Control-Allow-Origin"] = "*";
    ctx.Response.Headers["Access-Control-Allow-Headers"] = "content-type";
    ctx.Response.Headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    if (ctx.Request.Method == "OPTIONS")
    {
        ctx.Response.StatusCode = 204;
        return;
    }
    await next();
});

const double THRESHOLD = 35; // tune 25-45

app.MapPost("/verify", (VerifyRequest req) =>
{
    try
    {
        var probeBytes = DecodeDataUrlPng(req.probePng);
        var candBytes  = DecodeDataUrlPng(req.candidatePng);

        var (probeGray, pw, ph) = PngToGrayscale(probeBytes);
        var (candGray,  cw, ch) = PngToGrayscale(candBytes);

        // ✅ SourceAFIS expects FingerprintImage( width, height, pixels )
        // Your earlier compile error showed it wants (int, int, byte[])
        var probeImage = new FingerprintImage(pw, ph, probeGray);
        var candImage  = new FingerprintImage(cw, ch, candGray);

        var probeTemplate = new FingerprintTemplate(probeImage);
        var candTemplate  = new FingerprintTemplate(candImage);

        var matcher = new FingerprintMatcher(probeTemplate);
        double score = matcher.Match(candTemplate);

        bool match = score >= THRESHOLD;
        return Results.Ok(new { score = (int)Math.Round(score), threshold = (int)THRESHOLD, match });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.Run("http://localhost:5055");

// ---------- helpers ----------
static byte[] DecodeDataUrlPng(string dataUrl)
{
    if (string.IsNullOrWhiteSpace(dataUrl))
        throw new Exception("Empty image");

    var m = Regex.Match(dataUrl, @"^data:image\/png;base64,(.*)$");
    string b64 = m.Success ? m.Groups[1].Value : dataUrl;
    return Convert.FromBase64String(b64);
}

static (byte[] gray, int w, int h) PngToGrayscale(byte[] png)
{
    using Image<Rgba32> img = Image.Load<Rgba32>(png);

    int w = img.Width;
    int h = img.Height;
    var gray = new byte[w * h];

    // Version-safe pixel access (works even if GetPixelRowSpan doesn't exist)
    img.ProcessPixelRows(accessor =>
    {
        for (int y = 0; y < h; y++)
        {
            var row = accessor.GetRowSpan(y);
            for (int x = 0; x < w; x++)
            {
                var p = row[x];
                int g = (p.R * 30 + p.G * 59 + p.B * 11) / 100;
                gray[y * w + x] = (byte)g;
            }
        }
    });

    return (gray, w, h);
}


public record VerifyRequest(string probePng, string candidatePng);
