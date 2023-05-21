using FaceRecognizer.Interfaces;
using FaceRecognizer.Models;
using Microsoft.AspNetCore.Mvc;

namespace FaceRecognizer.Controllers;

[ApiController]
[Route("[controller]")]
public class RecognizeController : Controller
{
    private IPersonRecognizer recognizer;

    public RecognizeController(IPersonRecognizer recognizer)
    {
        this.recognizer = recognizer;
    }

    [HttpPost]
    public async Task<IActionResult> RecognizePerson([FromForm] IFormFile image)
    {
        RecognizedPerson person = await recognizer.Recognize(image);

        if (!person.IsRecognized)
            return BadRequest(person);

        return Ok(person);
    }
}
