using FaceRecognizer.Models;
using FaceRecognizer.Services;
using Microsoft.AspNetCore.Mvc;

namespace FaceRecognizer.Controllers;

[ApiController]
[Route("[controller]")]
public class RecognizerController : Controller
{
    private PersonRecognizer recognizer;

    [HttpPost]
    public async Task<RecognizedPerson> RecognizePerson()
    {
        return recognizer.Recognize();
    }
}
