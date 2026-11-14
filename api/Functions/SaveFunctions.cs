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
/// GET  /api/saves/{playerId}  → the save, or 404
/// PUT  /api/saves/{playerId}  → save (409 if the cloud has a newer one)
///
/// Note: for now the player id (GUID) is the only "key". When there are more players,
/// add sign-in (e.g. Static Web Apps authentication or Entra External ID).
/// </summary>
public sealed class SaveFunctions(SaveRepository repo, ILogger<SaveFunctions> log)
{
    private const int MaxBytes = 32 * 1024;

    [Function("GetSave")]
    public async Task<IActionResult> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "saves/{playerId}")] HttpRequest req,
        string playerId)
    {
        if (!Guid.TryParse(playerId, out _)) return new BadRequestObjectResult("playerId is not a GUID");
        var save = await repo.GetAsync(playerId, req.HttpContext.RequestAborted);
        if (save is null) return new NotFoundResult();
        return new ContentResult { Content = save.Json, ContentType = "application/json", StatusCode = 200 };
    }

    [Function("PutSave")]
    public async Task<IActionResult> Put(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "saves/{playerId}")] HttpRequest req,
        string playerId)
    {
        if (!Guid.TryParse(playerId, out _)) return new BadRequestObjectResult("playerId is not a GUID");
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
            return new BadRequestObjectResult("Invalid JSON");
        }

        var error = save?.Validate(playerId) ?? "Empty save";
        if (error is not null) return new BadRequestObjectResult(error);

        var ok = await repo.UpsertAsync(playerId, json, save!.UpdatedAt, req.HttpContext.RequestAborted);
        if (!ok)
        {
            log.LogInformation("Save rejected, the cloud has a newer version ({PlayerId})", playerId);
            return new ConflictResult();
        }
        return new NoContentResult();
    }

    [Function("Health")]
    public IActionResult Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req) =>
        new OkObjectResult(new { status = "ok", time = DateTimeOffset.UtcNow });
}
