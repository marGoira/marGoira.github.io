using System.Text;
using System.Text.Json;
using Kantama.Api.Models;
using Kantama.Api.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Kantama.Api.Functions;

/// <summary>
/// GET  /api/saves/{playerId}  → tallennus tai 404
/// PUT  /api/saves/{playerId}  → tallenna (409, jos pilvessä on uudempi)
///
/// Huom: pelaajan id (GUID) toimii toistaiseksi ainoana "avaimena". Kun pelaajia on enemmän,
/// lisää kirjautuminen (esim. Static Web Apps -autentikointi tai Entra External ID).
/// </summary>
public sealed class SaveFunctions(SaveRepository repo, ILogger<SaveFunctions> log)
{
    private const int MaxBytes = 32 * 1024;

    [Function("GetSave")]
    public async Task<IActionResult> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "saves/{playerId}")] HttpRequest req,
        string playerId)
    {
        if (!Guid.TryParse(playerId, out _)) return new BadRequestObjectResult("playerId ei ole GUID");
        var save = await repo.GetAsync(playerId, req.HttpContext.RequestAborted);
        if (save is null) return new NotFoundResult();
        return new ContentResult { Content = save.Json, ContentType = "application/json", StatusCode = 200 };
    }

    [Function("PutSave")]
    public async Task<IActionResult> Put(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "saves/{playerId}")] HttpRequest req,
        string playerId)
    {
        if (!Guid.TryParse(playerId, out _)) return new BadRequestObjectResult("playerId ei ole GUID");
        if (req.ContentLength is > MaxBytes) return new StatusCodeResult(StatusCodes.Status413PayloadTooLarge);

        using var reader = new StreamReader(req.Body, Encoding.UTF8);
        var json = await reader.ReadToEndAsync(req.HttpContext.RequestAborted);
        if (Encoding.UTF8.GetByteCount(json) > MaxBytes) return new StatusCodeResult(StatusCodes.Status413PayloadTooLarge);

        SaveGame? save;
        try
        {
            save = JsonSerializer.Deserialize<SaveGame>(json, SaveGame.JsonOptions);
        }
        catch (JsonException)
        {
            return new BadRequestObjectResult("Virheellinen JSON");
        }

        var error = save?.Validate(playerId) ?? "Tyhjä tallennus";
        if (error is not null) return new BadRequestObjectResult(error);

        var ok = await repo.UpsertAsync(playerId, json, save!.UpdatedAt, req.HttpContext.RequestAborted);
        if (!ok)
        {
            log.LogInformation("Tallennus hylätty, pilvessä uudempi versio ({PlayerId})", playerId);
            return new ConflictResult();
        }
        return new NoContentResult();
    }

    [Function("Health")]
    public IActionResult Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req) =>
        new OkObjectResult(new { status = "ok", time = DateTimeOffset.UtcNow });
}
