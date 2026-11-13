using System.Text.Json;

namespace Kantama.Api.Models;

/// <summary>
/// Pelin tallennuksen kentät, joita rajapinta tarkistaa. Muut kentät tallennetaan JSONina sellaisenaan.
/// Pidä linjassa tiedoston web/src/state/gameState.ts kanssa.
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

    /// <summary>Palauttaa virheviestin tai null, jos tallennus kelpaa.</summary>
    public string? Validate(string routePlayerId)
    {
        if (!string.Equals(PlayerId, routePlayerId, StringComparison.OrdinalIgnoreCase)) return "playerId ei täsmää";
        if (!DateTimeOffset.TryParse(UpdatedAt, out _)) return "updatedAt puuttuu tai on virheellinen";
        if (Credits < 0 || Research < 0) return "Negatiiviset resurssit";
        if (Hull is < 0 or > 3) return "Tuntematon runkoluokka";
        if (Tech.Count > 64) return "Liikaa teknologioita";
        if (ExoName.Length > 16) return "Planeetan nimi on liian pitkä";
        return null;
    }
}
