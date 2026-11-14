using System.Text.Json;

namespace Kantama.Api.Models;

/// <summary>
/// The save game fields the API validates. Other fields are stored as JSON unchanged.
/// Keep in line with web/src/state/gameState.ts.
/// </summary>
public sealed class SaveGame
{
    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public int Version { get; set; }
    public string PlayerId { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public double Credits { get; set; }
    public double Research { get; set; }
    public int Hull { get; set; }
    public List<string> Tech { get; set; } = [];
    public Dictionary<string, int> Visits { get; set; } = [];
    public bool Easy { get; set; }
    public string ExoName { get; set; } = "";

    /// <summary>Returns an error message, or null if the save is valid.</summary>
    public string? Validate(string routePlayerId)
    {
        if (!string.Equals(PlayerId, routePlayerId, StringComparison.OrdinalIgnoreCase)) return "playerId does not match";
        if (!DateTimeOffset.TryParse(UpdatedAt, out _)) return "updatedAt is missing or invalid";
        if (Credits < 0 || Research < 0) return "Negative resources";
        if (Hull is < 0 or > 3) return "Unknown hull class";
        if (Tech.Count > 64) return "Too many technologies";
        if (ExoName.Length > 16) return "Planet name is too long";
        return null;
    }
}
