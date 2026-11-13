using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Configuration;

namespace Kantama.Api.Storage;

/// <summary>
/// Pelitallennukset Azure Table Storagessa: PartitionKey = pelaajan id, RowKey = "save".
/// Tallennuksen JSON säilytetään sellaisenaan, joten pelin tilaan voi lisätä kenttiä ilman API-muutoksia.
/// </summary>
public sealed class SaveRepository
{
    private const string RowKey = "save";
    private readonly TableClient _table;
    private bool _ensured;

    public SaveRepository(TableServiceClient service, IConfiguration config)
    {
        _table = service.GetTableClient(config["Storage:SavesTable"] ?? "saves");
    }

    private async Task EnsureTableAsync(CancellationToken ct)
    {
        if (_ensured) return;
        await _table.CreateIfNotExistsAsync(ct);
        _ensured = true;
    }

    public async Task<SaveRecord?> GetAsync(string playerId, CancellationToken ct)
    {
        await EnsureTableAsync(ct);
        var result = await _table.GetEntityIfExistsAsync<TableEntity>(playerId, RowKey, cancellationToken: ct);
        if (!result.HasValue || result.Value is null) return null;
        var e = result.Value;
        return new SaveRecord(e.GetString("Data") ?? "{}", e.GetString("UpdatedAt") ?? "");
    }

    /// <summary>Tallentaa, ellei pilvessä ole jo uudempaa versiota. Palauttaa false, jos tallennus hylättiin.</summary>
    public async Task<bool> UpsertAsync(string playerId, string json, string updatedAt, CancellationToken ct)
    {
        await EnsureTableAsync(ct);
        var existing = await _table.GetEntityIfExistsAsync<TableEntity>(playerId, RowKey, cancellationToken: ct);
        var entity = new TableEntity(playerId, RowKey)
        {
            ["Data"] = json,
            ["UpdatedAt"] = updatedAt,
        };

        if (existing.HasValue && existing.Value is not null)
        {
            var storedAt = existing.Value.GetString("UpdatedAt") ?? "";
            // ISO 8601 -aikaleimat vertautuvat oikein merkkijonoina
            if (string.CompareOrdinal(storedAt, updatedAt) > 0) return false;
            try
            {
                await _table.UpdateEntityAsync(entity, existing.Value.ETag, TableUpdateMode.Replace, ct);
            }
            catch (RequestFailedException ex) when (ex.Status == 412)
            {
                return false; // toinen laite ehti väliin
            }
            return true;
        }

        await _table.UpsertEntityAsync(entity, TableUpdateMode.Replace, ct);
        return true;
    }
}

public sealed record SaveRecord(string Json, string UpdatedAt);
