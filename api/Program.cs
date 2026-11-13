using Azure.Data.Tables;
using Azure.Identity;
using Kantama.Api.Storage;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

// Paikallisesti: Storage__ConnectionString = UseDevelopmentStorage=true (Azurite).
// Pilvessä: Storage__TableEndpoint + Function Appin managed identity (ei salasanoja).
builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connectionString = config["Storage:ConnectionString"];
    if (!string.IsNullOrWhiteSpace(connectionString))
        return new TableServiceClient(connectionString);

    var endpoint = config["Storage:TableEndpoint"]
        ?? throw new InvalidOperationException("Aseta Storage__ConnectionString tai Storage__TableEndpoint.");
    return new TableServiceClient(new Uri(endpoint), new DefaultAzureCredential());
});

builder.Services.AddSingleton<SaveRepository>();

builder.Build().Run();
